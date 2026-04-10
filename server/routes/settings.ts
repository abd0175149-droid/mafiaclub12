import { Router } from 'express';
import db from '../database.js';
import { type AuthRequest, requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/settings
router.get('/', requireAuth, (req: AuthRequest, res) => {
  let settings = db.prepare('SELECT * FROM user_settings WHERE userId = ?').get(req.user!.id) as any;
  if (!settings) {
    db.prepare('INSERT INTO user_settings (userId) VALUES (?)').run(req.user!.id);
    settings = db.prepare('SELECT * FROM user_settings WHERE userId = ?').get(req.user!.id);
  }
  res.json({
    notifications: {
      newBooking: !!settings.newBooking,
      upcomingActivity: !!settings.upcomingActivity,
      costAlert: !!settings.costAlert
    },
    dashboardLayout: JSON.parse(settings.dashboardLayout || '[]')
  });
});

// PUT /api/settings
router.put('/', requireAuth, (req: AuthRequest, res) => {
  const { notifications, dashboardLayout } = req.body;
  
  const existing = db.prepare('SELECT * FROM user_settings WHERE userId = ?').get(req.user!.id);
  if (!existing) {
    db.prepare('INSERT INTO user_settings (userId) VALUES (?)').run(req.user!.id);
  }

  if (notifications) {
    db.prepare(
      'UPDATE user_settings SET newBooking=?, upcomingActivity=?, costAlert=? WHERE userId=?'
    ).run(
      notifications.newBooking ? 1 : 0,
      notifications.upcomingActivity ? 1 : 0,
      notifications.costAlert ? 1 : 0,
      req.user!.id
    );
  }

  if (dashboardLayout) {
    db.prepare('UPDATE user_settings SET dashboardLayout = ? WHERE userId = ?').run(
      JSON.stringify(dashboardLayout), req.user!.id
    );
  }

  res.json({ success: true });
});

export default router;
