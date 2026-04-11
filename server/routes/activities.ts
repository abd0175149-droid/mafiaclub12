import { Router } from 'express';
import db, { logAudit } from '../database.js';
import { type AuthRequest, requireAuth, requirePermission, requireAdmin } from '../middleware/auth.js';

const router = Router();

// GET /api/activities
router.get('/', requireAuth, (_req, res) => {
  const rows = db.prepare('SELECT * FROM activities ORDER BY date DESC').all();
  res.json(rows);
});

// POST /api/activities
router.post('/', requireAuth, requirePermission('activities'), (req: AuthRequest, res) => {
  const { name, date, description, basePrice, status, locationId, driveLink } = req.body;
  if (!name || !date) return res.status(400).json({ error: 'الاسم والتاريخ مطلوبان' });

  const result = db.prepare(
    'INSERT INTO activities (name, date, description, basePrice, status, locationId, driveLink) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(name, date, description || '', basePrice || 0, status || 'planned', locationId || null, driveLink || '');

  logAudit(req.user!.id, 'create', 'activities', Number(result.lastInsertRowid));

  const admins = db.prepare('SELECT id FROM staff WHERE role = ?').all('admin') as { id: number }[];
  const notifyStmt = db.prepare('INSERT INTO notifications (userId, title, message, type, targetId) VALUES (?, ?, ?, ?, ?)');
  for (const admin of admins) {
    if (admin.id !== req.user!.id) {
      notifyStmt.run(admin.id, 'نشاط جديد', `تم جدولة نشاط جديد: ${name}`, 'new_activity', 'activity-' + result.lastInsertRowid.toString());
    }
  }

  const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(activity);
});

// PUT /api/activities/:id
router.put('/:id', requireAuth, requirePermission('activities'), (req: AuthRequest, res) => {
  const { id } = req.params;
  const { name, date, description, basePrice, status, locationId, driveLink } = req.body;

  db.prepare(
    'UPDATE activities SET name=COALESCE(?,name), date=COALESCE(?,date), description=COALESCE(?,description), basePrice=COALESCE(?,basePrice), status=COALESCE(?,status), locationId=COALESCE(?,locationId), driveLink=COALESCE(?,driveLink) WHERE id=?'
  ).run(name, date, description, basePrice, status, locationId !== undefined ? locationId : null, driveLink !== undefined ? driveLink : null, id);

  logAudit(req.user!.id, 'update', 'activities', id, req.body);
  const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(id);
  if (!activity) return res.status(404).json({ error: 'النشاط غير موجود' });
  res.json(activity);
});

// DELETE /api/activities/:id (cascade: bookings + costs)
router.delete('/:id', requireAuth, requirePermission('activities'), (req: AuthRequest, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM activities WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'النشاط غير موجود' });

  // CASCADE is handled by SQLite foreign keys
  db.prepare('DELETE FROM activities WHERE id = ?').run(id);
  logAudit(req.user!.id, 'delete', 'activities', id);
  res.json({ success: true });
});

export default router;
