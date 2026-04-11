import { Router } from 'express';
import db, { logAudit } from '../database.js';
import { requireAuth, requirePermission, type AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/locations
router.get('/', requireAuth, (req, res) => {
  const locations = db.prepare('SELECT * FROM locations ORDER BY id DESC').all();
  // Parse offers back to real arrays
  locations.forEach((loc: any) => {
    try {
      loc.offers = JSON.parse(loc.offers);
    } catch {
      loc.offers = [];
    }
  });
  res.json(locations);
});

// POST /api/locations
router.post('/', requireAuth, requirePermission('locations'), (req: AuthRequest, res) => {
  const { name, mapUrl, offers } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const offersStr = JSON.stringify(Array.isArray(offers) ? offers : []);

  const info = db.prepare('INSERT INTO locations (name, mapUrl, offers) VALUES (?, ?, ?)').run(
    name, mapUrl || '', offersStr
  );

  const admins = db.prepare('SELECT id FROM staff WHERE role = ?').all('admin') as any[];
  const notifyStmt = db.prepare('INSERT INTO notifications (userId, title, message, type, targetId) VALUES (?, ?, ?, ?, ?)');
  for (const admin of admins) {
    notifyStmt.run(admin.id, 'مكان جديد', `تم إضافة مكان فعالية جديد: ${name}`, 'new_location', 'location-' + info.lastInsertRowid.toString());
  }

  logAudit(req.user!.id, 'CREATE', 'locations', Number(info.lastInsertRowid));
  res.status(201).json({ id: Number(info.lastInsertRowid), name, mapUrl, offers: JSON.parse(offersStr) });
});

// PUT /api/locations/:id
router.put('/:id', requireAuth, requirePermission('locations'), (req: AuthRequest, res) => {
  const { name, mapUrl, offers } = req.body;
  const id = req.params.id;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const offersStr = JSON.stringify(Array.isArray(offers) ? offers : []);

  db.prepare('UPDATE locations SET name = ?, mapUrl = ?, offers = ? WHERE id = ?').run(
    name, mapUrl || '', offersStr, id
  );
  logAudit(req.user!.id, 'UPDATE', 'locations', id);
  res.json({ success: true });
});

// DELETE /api/locations/:id
router.delete('/:id', requireAuth, requirePermission('locations'), (req: AuthRequest, res) => {
  const id = req.params.id;
  db.prepare('DELETE FROM locations WHERE id = ?').run(id);
  logAudit(req.user!.id, 'DELETE', 'locations', id);
  res.json({ success: true });
});

export default router;
