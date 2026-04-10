import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../database.js';
import { generateToken, type AuthRequest, requireAuth } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'اسم المستخدم وكلمة المرور مطلوبان' });
  }

  const user = db.prepare('SELECT * FROM staff WHERE username = ?').get(username) as any;
  if (!user) {
    return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
  }

  if (!bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
  }

  let permissions = [];
  try {
    permissions = user.permissions ? JSON.parse(user.permissions) : [];
  } catch (e) {
    permissions = [];
  }

  const tokenPayload = {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    permissions
  };

  const token = generateToken(tokenPayload);
  // Return photoURL separately (not in JWT to avoid 431 header too large)
  res.json({ token, profile: { ...tokenPayload, photoURL: user.photoURL || null } });
});

// GET /api/auth/me - fetch fresh profile from DB (includes photoURL)
router.get('/me', requireAuth, (req: AuthRequest, res) => {
  const user = db.prepare('SELECT id, username, displayName, role, photoURL, permissions FROM staff WHERE id = ?').get(req.user!.id) as any;
  if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
  let permissions = [];
  try { permissions = user.permissions ? JSON.parse(user.permissions) : []; } catch { permissions = []; }
  res.json({ profile: { ...user, permissions, photoURL: user.photoURL || null } });
});

export default router;
