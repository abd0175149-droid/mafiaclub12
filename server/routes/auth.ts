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
    photoURL: user.photoURL,
    permissions
  };

  const token = generateToken(tokenPayload);
  res.json({ token, profile: tokenPayload });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req: AuthRequest, res) => {
  res.json({ profile: req.user });
});

export default router;
