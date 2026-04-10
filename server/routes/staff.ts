import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db, { logAudit } from '../database.js';
import { type AuthRequest, requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

// GET /api/staff (admin only)
router.get('/', requireAuth, requireAdmin, (_req, res) => {
  const rows = db.prepare('SELECT id, username, displayName, role, photoURL, permissions, createdAt FROM staff ORDER BY createdAt DESC').all();
  res.json(rows);
});

// POST /api/staff (admin only)
router.post('/', requireAuth, requireAdmin, (req: AuthRequest, res) => {
  const { username, password, displayName, role, permissions } = req.body;
  if (!username || !password || !displayName) {
    return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
  }

  // Check unique username
  const existing = db.prepare('SELECT id FROM staff WHERE username = ?').get(username);
  if (existing) {
    return res.status(409).json({ error: 'اسم المستخدم موجود بالفعل' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const permsStr = permissions ? JSON.stringify(permissions) : '["activities","bookings","finances","locations"]';
  
  const result = db.prepare(
    'INSERT INTO staff (username, password, displayName, role, permissions) VALUES (?,?,?,?,?)'
  ).run(username, hash, displayName, role || 'manager', permsStr);

  // Create default settings
  db.prepare('INSERT INTO user_settings (userId) VALUES (?)').run(result.lastInsertRowid);

  logAudit(req.user!.id, 'create', 'staff', result.lastInsertRowid.toString());
  const staff = db.prepare('SELECT id, username, displayName, role, photoURL, permissions, createdAt FROM staff WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(staff);
});

// PUT /api/staff/me (Update own profile: photo, name)
router.put('/me', requireAuth, (req: AuthRequest, res) => {
  const { displayName, photoURL } = req.body;
  
  if (displayName) {
    db.prepare('UPDATE staff SET displayName = ? WHERE id = ?').run(displayName, req.user!.id);
  }
  if (photoURL !== undefined) {
    db.prepare('UPDATE staff SET photoURL = ? WHERE id = ?').run(photoURL, req.user!.id);
  }
  
  logAudit(req.user!.id, 'update', 'staff_self', req.user!.id);
  res.json({ success: true });
});

// PUT /api/staff/:id (admin only, update entire profile)
router.put('/:id', requireAuth, requireAdmin, (req: AuthRequest, res) => {
  const { displayName, role, permissions } = req.body;
  if (!displayName) {
    return res.status(400).json({ error: 'الاسم مطلوب' });
  }

  const permsStr = permissions ? JSON.stringify(permissions) : '["activities","bookings","finances","locations"]';

  db.prepare('UPDATE staff SET displayName = ?, role = ?, permissions = ? WHERE id = ?').run(
    displayName, role || 'manager', permsStr, req.params.id
  );
  logAudit(req.user!.id, 'update', 'staff', req.params.id);
  res.json({ success: true });
});

// PUT /api/staff/:id/role (admin only)
router.put('/:id/role', requireAuth, requireAdmin, (req: AuthRequest, res) => {
  const { role } = req.body;
  if (!['admin', 'manager'].includes(role)) {
    return res.status(400).json({ error: 'صلاحية غير صالحة' });
  }

  db.prepare('UPDATE staff SET role = ? WHERE id = ?').run(role, req.params.id);
  logAudit(req.user!.id, 'update', 'staff', req.params.id, { role });
  res.json({ success: true });
});

// PUT /api/staff/:id/password (admin only)
router.put('/:id/password', requireAuth, requireAdmin, (req: AuthRequest, res) => {
  const { password } = req.body;
  if (!password || password.length < 4) {
    return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 4 أحرف على الأقل' });
  }

  const hash = bcrypt.hashSync(password, 10);
  db.prepare('UPDATE staff SET password = ? WHERE id = ?').run(hash, req.params.id);
  logAudit(req.user!.id, 'update', 'staff', req.params.id, { action: 'password_change' });
  res.json({ success: true });
});

// DELETE /api/staff/:id (admin only)
router.delete('/:id', requireAuth, requireAdmin, (req: AuthRequest, res) => {
  const existing = db.prepare('SELECT * FROM staff WHERE id = ?').get(req.params.id) as any;
  if (!existing) return res.status(404).json({ error: 'الموظف غير موجود' });

  // Don't allow deleting yourself
  if (existing.id === (req as AuthRequest).user!.id) {
    return res.status(400).json({ error: 'لا يمكنك حذف حسابك الخاص' });
  }

  db.prepare('DELETE FROM staff WHERE id = ?').run(req.params.id);
  logAudit(req.user!.id, 'delete', 'staff', req.params.id);
  res.json({ success: true });
});

export default router;
