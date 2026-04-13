import { Router } from 'express';
import db, { logAudit } from '../database.js';
import { type AuthRequest, requireAuth, requirePermission, requireAdmin } from '../middleware/auth.js';

const router = Router();

// GET /api/activities
router.get('/', requireAuth, (req: AuthRequest, res) => {
  if (req.user?.role === 'location_owner' && req.user.locationId) {
    const rows = db.prepare('SELECT * FROM activities WHERE locationId = ? ORDER BY date DESC').all(req.user.locationId) as any[];
    rows.forEach(r => { 
      try { r.enabledOfferIds = JSON.parse(r.enabledOfferIds || '[]'); } catch { r.enabledOfferIds = []; } 
      r.isLocked = r.isLocked === 1;
    });
    return res.json(rows);
  }
  const rows = db.prepare('SELECT * FROM activities ORDER BY date DESC').all() as any[];
  rows.forEach(r => { 
    try { r.enabledOfferIds = JSON.parse(r.enabledOfferIds || '[]'); } catch { r.enabledOfferIds = []; } 
    r.isLocked = r.isLocked === 1;
  });
  res.json(rows);
});

// POST /api/activities
router.post('/', requireAuth, requirePermission('activities'), (req: AuthRequest, res) => {
  const { name, date, description, basePrice, status, locationId, driveLink, enabledOfferIds, isLocked } = req.body;
  if (!name || !date) return res.status(400).json({ error: 'الاسم والتاريخ مطلوبان' });

  const enabledOffersStr = JSON.stringify(Array.isArray(enabledOfferIds) ? enabledOfferIds : []);
  const result = db.prepare(
    'INSERT INTO activities (name, date, description, basePrice, status, locationId, driveLink, enabledOfferIds, isLocked) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(name, date, description || '', basePrice || 0, status || 'planned', locationId || null, driveLink || '', enabledOffersStr, isLocked ? 1 : 0);

  logAudit(req.user!.id, 'create', 'activities', Number(result.lastInsertRowid));

  const admins = db.prepare('SELECT id FROM staff WHERE role = ?').all('admin') as { id: number }[];
  const notifyStmt = db.prepare('INSERT INTO notifications (userId, title, message, type, targetId) VALUES (?, ?, ?, ?, ?)');
  for (const admin of admins) {
    if (admin.id !== req.user!.id) {
      notifyStmt.run(admin.id, 'نشاط جديد', `تم جدولة نشاط جديد: ${name}`, 'new_activity', 'activity-' + result.lastInsertRowid.toString());
    }
  }

  // Notify location_owner if activity is at their location
  if (locationId) {
    const owners = db.prepare('SELECT id FROM staff WHERE role = ? AND locationId = ?').all('location_owner', locationId) as any[];
    for (const owner of owners) {
      notifyStmt.run(owner.id, 'نشاط جديد في مكانك', `تم جدولة نشاط جديد: ${name}`, 'new_activity', 'activity-' + result.lastInsertRowid.toString());
    }
  }

  const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(result.lastInsertRowid) as any;
  try { activity.enabledOfferIds = JSON.parse(activity.enabledOfferIds || '[]'); } catch { activity.enabledOfferIds = []; }
  res.status(201).json(activity);
});

// PUT /api/activities/:id
router.put('/:id', requireAuth, requirePermission('activities'), (req: AuthRequest, res) => {
  const { id } = req.params;
  const { name, date, description, basePrice, status, locationId, driveLink, enabledOfferIds, isLocked } = req.body;

  const enabledOffersStr = enabledOfferIds !== undefined ? JSON.stringify(Array.isArray(enabledOfferIds) ? enabledOfferIds : []) : null;
  db.prepare(
    'UPDATE activities SET name=COALESCE(?,name), date=COALESCE(?,date), description=COALESCE(?,description), basePrice=COALESCE(?,basePrice), status=COALESCE(?,status), locationId=COALESCE(?,locationId), driveLink=COALESCE(?,driveLink), enabledOfferIds=COALESCE(?,enabledOfferIds), isLocked=COALESCE(?,isLocked) WHERE id=?'
  ).run(name, date, description, basePrice, status, locationId !== undefined ? locationId : null, driveLink !== undefined ? driveLink : null, enabledOffersStr, isLocked !== undefined ? (isLocked ? 1 : 0) : null, id);

  logAudit(req.user!.id, 'update', 'activities', id, req.body);
  const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(id) as any;
  if (!activity) return res.status(404).json({ error: 'النشاط غير موجود' });
  try { activity.enabledOfferIds = JSON.parse(activity.enabledOfferIds || '[]'); } catch { activity.enabledOfferIds = []; }
  res.json(activity);
});

// DELETE /api/activities/:id (cascade: bookings + costs)
router.delete('/:id', requireAuth, requirePermission('activities'), async (req: AuthRequest, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM activities WHERE id = ?').get(id) as any;
  if (!existing) return res.status(404).json({ error: 'النشاط غير موجود' });

  if (existing.driveLink && req.query.deleteDriveFolder === 'true') {
    try {
      const match = existing.driveLink.match(/\/folders\/([a-zA-Z0-9_-]+)/);
      const folderId = match ? match[1] : (existing.driveLink.match(/[?&]id=([a-zA-Z0-9_-]+)/)?.[1] || null);
      
      if (folderId) {
        const { google } = await import('googleapis');
        const path = await import('path');
        const fs = await import('fs');
        const SERVICE_ACCOUNT_FILE = path.resolve(process.cwd(), 'google-service-account.json');
        if (fs.existsSync(SERVICE_ACCOUNT_FILE)) {
          const auth = new google.auth.GoogleAuth({ keyFile: SERVICE_ACCOUNT_FILE, scopes: ['https://www.googleapis.com/auth/drive'] });
          const drive = google.drive({ version: 'v3', auth });
          await drive.files.delete({ fileId: folderId });
        }
      }
    } catch (err: any) {
      console.error('Failed to delete Drive folder:', err.message);
    }
  }

  // CASCADE is handled by SQLite foreign keys
  db.prepare('DELETE FROM activities WHERE id = ?').run(id);
  logAudit(req.user!.id, 'delete', 'activities', id);
  res.json({ success: true });
});

export default router;
