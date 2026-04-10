import { Router } from 'express';
import db, { logAudit } from '../database.js';
import { type AuthRequest, requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/costs
router.get('/', requireAuth, (_req, res) => {
  const rows = db.prepare('SELECT * FROM costs ORDER BY date DESC').all();
  res.json(rows);
});

// POST /api/costs
router.post('/', requireAuth, (req: AuthRequest, res) => {
  const { activityId, item, amount, date, paidBy, type } = req.body;
  if (!item || amount === undefined || !date) return res.status(400).json({ error: 'البند والمبلغ والتاريخ مطلوبين' });

  const result = db.prepare(
    'INSERT INTO costs (activityId, item, amount, date, paidBy, type) VALUES (?,?,?,?,?,?)'
  ).run(activityId || null, item, amount, date, paidBy || '', type || 'general');

  logAudit(req.user!.id, 'create', 'costs', result.lastInsertRowid.toString());
  const cost = db.prepare('SELECT * FROM costs WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(cost);
});

// DELETE /api/costs/:id
router.delete('/:id', requireAuth, (req: AuthRequest, res) => {
  const existing = db.prepare('SELECT * FROM costs WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'المصروف غير موجود' });

  db.prepare('DELETE FROM costs WHERE id = ?').run(req.params.id);
  logAudit(req.user!.id, 'delete', 'costs', req.params.id);
  res.json({ success: true });
});

export default router;
