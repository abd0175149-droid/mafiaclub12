import { Router } from 'express';
import db, { logAudit } from '../database.js';
import { type AuthRequest, requireAuth, requirePermission } from '../middleware/auth.js';

const router = Router();

// GET /api/costs
router.get('/', requireAuth, (req: AuthRequest, res) => {
  // location_owner sees no costs (revenue-only view)
  if (req.user?.role === 'location_owner') return res.json([]);
  const rows = db.prepare('SELECT * FROM costs ORDER BY date DESC').all();
  res.json(rows);
});

// POST /api/costs
router.post('/', requireAuth, requirePermission('finances'), (req: AuthRequest, res) => {
  const { activityId, item, amount, date, paidBy, type } = req.body;
  if (!item || amount === undefined || !date) return res.status(400).json({ error: 'البند والمبلغ والتاريخ مطلوبين' });

  const result = db.prepare(
    'INSERT INTO costs (activityId, item, amount, date, paidBy, type) VALUES (?,?,?,?,?,?)'
  ).run(activityId || null, item, amount, date, paidBy || '', type || 'general');

  const admins = db.prepare('SELECT id FROM staff WHERE role = ?').all('admin') as any[];
  const notifyStmt = db.prepare('INSERT INTO notifications (userId, title, message, type, targetId) VALUES (?, ?, ?, ?, ?)');
  for (const admin of admins) {
    notifyStmt.run(admin.id, 'مصروف جديد', `تم إضافة مصروف جديد: ${item}`, 'cost_alert', 'cost-' + result.lastInsertRowid.toString());
  }

  logAudit(req.user!.id, 'create', 'costs', result.lastInsertRowid.toString());
  const cost = db.prepare('SELECT * FROM costs WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(cost);
});

// DELETE /api/costs/:id
router.delete('/:id', requireAuth, requirePermission('finances'), (req: AuthRequest, res) => {
  const existing = db.prepare('SELECT * FROM costs WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'المصروف غير موجود' });

  db.prepare('DELETE FROM costs WHERE id = ?').run(req.params.id);
  logAudit(req.user!.id, 'delete', 'costs', req.params.id);
  res.json({ success: true });
});

export default router;
