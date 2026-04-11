import { Router } from 'express';
import db, { logAudit } from '../database.js';
import { type AuthRequest, requireAuth, requirePermission, requireAdmin } from '../middleware/auth.js';

const router = Router();

// GET /api/foundational
router.get('/', requireAuth, (req: AuthRequest, res) => {
  // location_owner sees no foundational costs
  if (req.user?.role === 'location_owner') return res.json([]);
  const rows = db.prepare('SELECT * FROM foundational_costs ORDER BY date DESC').all();
  res.json(rows);
});

// POST /api/foundational
router.post('/', requireAuth, requirePermission('finances'), (req: AuthRequest, res) => {
  const { item, amount, paidBy, source, date } = req.body;
  if (!item || amount === undefined || !date) return res.status(400).json({ error: 'البند والمبلغ والتاريخ مطلوبين' });

  const result = db.prepare(
    'INSERT INTO foundational_costs (item, amount, paidBy, source, date) VALUES (?,?,?,?,?)'
  ).run(item, amount, paidBy || '', source || '', date);

  logAudit(req.user!.id, 'create', 'foundational_costs', result.lastInsertRowid.toString());

  const admins = db.prepare('SELECT id FROM staff WHERE role = ?').all('admin') as { id: number }[];
  const notifyStmt = db.prepare('INSERT INTO notifications (userId, title, message, type, targetId) VALUES (?, ?, ?, ?, ?)');
  for (const admin of admins) {
    if (admin.id !== req.user!.id) {
      notifyStmt.run(admin.id, 'تكلفة تأسيسية', `تم تسجيل مصروف تأسيسي جديد: ${item}`, 'foundational_cost', 'foundational-' + result.lastInsertRowid.toString());
    }
  }

  const cost = db.prepare('SELECT * FROM foundational_costs WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(cost);
});

// DELETE /api/foundational/:id
router.delete('/:id', requireAuth, requirePermission('finances'), (req: AuthRequest, res) => {
  const existing = db.prepare('SELECT * FROM foundational_costs WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'التكلفة غير موجودة' });

  db.prepare('DELETE FROM foundational_costs WHERE id = ?').run(req.params.id);
  logAudit(req.user!.id, 'delete', 'foundational_costs', req.params.id);
  res.json({ success: true });
});

export default router;

// PUT /api/foundational/:id/process
router.put('/:id/process', requireAuth, requirePermission('finances'), (req: AuthRequest, res) => {
  const { isProcessed } = req.body;
  const existing = db.prepare('SELECT * FROM foundational_costs WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'التكلفة غير موجودة' });

  db.prepare('UPDATE foundational_costs SET isProcessed = ? WHERE id = ?').run(isProcessed ? 1 : 0, req.params.id);
  logAudit(req.user!.id, 'update', 'foundational_costs_process', req.params.id);
  res.json({ success: true, isProcessed: isProcessed ? 1 : 0 });
});
