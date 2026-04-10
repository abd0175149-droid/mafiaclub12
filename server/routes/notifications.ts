import { Router } from 'express';
import db from '../database.js';
import { type AuthRequest, requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/notifications
router.get('/', requireAuth, (req: AuthRequest, res) => {
  const rows = db.prepare('SELECT * FROM notifications WHERE userId = ? ORDER BY createdAt DESC').all(req.user!.id);
  res.json(rows);
});

// PUT /api/notifications/:id/read
router.put('/:id/read', requireAuth, (req: AuthRequest, res) => {
  db.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND userId = ?').run(req.params.id, req.user!.id);
  res.json({ success: true });
});

// PUT /api/notifications/read-all
router.put('/read-all', requireAuth, (req: AuthRequest, res) => {
  db.prepare('UPDATE notifications SET read = 1 WHERE userId = ?').run(req.user!.id);
  res.json({ success: true });
});

export default router;
