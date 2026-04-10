import { Router } from 'express';
import db, { logAudit } from '../database.js';
import { type AuthRequest, requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

// GET /api/foundational
router.get('/', requireAuth, (_req, res) => {
  const rows = db.prepare('SELECT * FROM foundational_costs ORDER BY date DESC').all();
  res.json(rows);
});

// POST /api/foundational
router.post('/', requireAuth, requireAdmin, (req: AuthRequest, res) => {
  const { item, amount, paidBy, source, date } = req.body;
  if (!item || amount === undefined || !date) return res.status(400).json({ error: 'البند والمبلغ والتاريخ مطلوبين' });

  const result = db.prepare(
    'INSERT INTO foundational_costs (item, amount, paidBy, source, date) VALUES (?,?,?,?,?)'
  ).run(item, amount, paidBy || '', source || '', date);

  logAudit(req.user!.id, 'create', 'foundational_costs', result.lastInsertRowid);
  const cost = db.prepare('SELECT * FROM foundational_costs WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(cost);
});

// DELETE /api/foundational/:id
router.delete('/:id', requireAuth, requireAdmin, (req: AuthRequest, res) => {
  const existing = db.prepare('SELECT * FROM foundational_costs WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'التكلفة غير موجودة' });

  db.prepare('DELETE FROM foundational_costs WHERE id = ?').run(req.params.id);
  logAudit(req.user!.id, 'delete', 'foundational_costs', req.params.id);
  res.json({ success: true });
});

export default router;
