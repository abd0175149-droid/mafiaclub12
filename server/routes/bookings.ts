import { Router } from 'express';
import db, { logAudit } from '../database.js';
import { type AuthRequest, requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/bookings?search=&activityId=&status=
router.get('/', requireAuth, (req: AuthRequest, res) => {
  let sql = 'SELECT * FROM bookings';
  const conditions: string[] = [];
  const params: any[] = [];

  // location_owner: restrict to their location's activities
  if (req.user?.role === 'location_owner' && req.user.locationId) {
    const activityIds = (db.prepare('SELECT id FROM activities WHERE locationId = ?').all(req.user.locationId) as any[]).map(a => a.id);
    if (activityIds.length === 0) return res.json([]);
    conditions.push(`activityId IN (${activityIds.map(() => '?').join(',')})`);
    params.push(...activityIds);
  }

  if (req.query.activityId && req.query.activityId !== 'all') {
    conditions.push('activityId = ?');
    params.push(req.query.activityId);
  }

  if (req.query.status && req.query.status !== 'all') {
    if (req.query.status === 'paid') { conditions.push('isPaid = 1 AND isFree = 0'); }
    else if (req.query.status === 'free') { conditions.push('isFree = 1'); }
    else if (req.query.status === 'unpaid') { conditions.push('isPaid = 0 AND isFree = 0'); }
  }

  if (req.query.search) {
    conditions.push('(name LIKE ? OR phone LIKE ?)');
    params.push(`%${req.query.search}%`, `%${req.query.search}%`);
  }

  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY createdAt DESC';

  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

// POST /api/bookings
router.post('/', requireAuth, (req: AuthRequest, res) => {
  const { activityId, name, phone, count, isPaid, paidAmount, receivedBy, isFree, notes } = req.body;
  if (!activityId || !name) return res.status(400).json({ error: 'النشاط والاسم مطلوبان' });

  const result = db.prepare(
    'INSERT INTO bookings (activityId, name, phone, count, isPaid, paidAmount, receivedBy, isFree, notes) VALUES (?,?,?,?,?,?,?,?,?)'
  ).run(activityId, name, phone || '', count || 1, isPaid ? 1 : 0, paidAmount || 0, receivedBy || '', isFree ? 1 : 0, notes || '');

  logAudit(req.user!.id, 'create', 'bookings', result.lastInsertRowid.toString());

  // Notify all admins
  const admins = db.prepare('SELECT id FROM staff WHERE role = ?').all('admin') as any[];
  const notifyStmt = db.prepare('INSERT INTO notifications (userId, title, message, type, targetId) VALUES (?, ?, ?, ?, ?)');
  for (const admin of admins) {
    notifyStmt.run(admin.id, 'حجز جديد', `حجز جديد باسم ${name}`, 'new_booking', 'booking-' + result.lastInsertRowid.toString());
  }

  // Notify location_owner if this activity belongs to their location
  const activity = db.prepare('SELECT locationId FROM activities WHERE id = ?').get(activityId) as any;
  if (activity?.locationId) {
    const owners = db.prepare('SELECT id FROM staff WHERE role = ? AND locationId = ?').all('location_owner', activity.locationId) as any[];
    for (const owner of owners) {
      notifyStmt.run(owner.id, 'حجز جديد', `حجز جديد باسم ${name}`, 'new_booking', 'booking-' + result.lastInsertRowid.toString());
    }
  }

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(booking);
});

// PUT /api/bookings/:id
router.put('/:id', requireAuth, (req: AuthRequest, res) => {
  const { id } = req.params;
  const { name, phone, count, paidAmount, receivedBy, notes, isPaid, isFree } = req.body;

  const existing = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id) as any;
  if (!existing) return res.status(404).json({ error: 'الحجز غير موجود' });

  db.prepare(
    `UPDATE bookings SET 
      name=COALESCE(?,name), phone=COALESCE(?,phone), count=COALESCE(?,count),
      paidAmount=COALESCE(?,paidAmount), receivedBy=COALESCE(?,receivedBy), notes=COALESCE(?,notes),
      isPaid=COALESCE(?,isPaid), isFree=COALESCE(?,isFree)
    WHERE id=?`
  ).run(name, phone, count, paidAmount, receivedBy, notes, isPaid !== undefined ? (isPaid ? 1 : 0) : null, isFree !== undefined ? (isFree ? 1 : 0) : null, id);

  if (isPaid === true && !existing.isPaid) {
    const admins = db.prepare('SELECT id FROM staff WHERE role = ?').all('admin') as any[];
    const notifyStmt = db.prepare('INSERT INTO notifications (userId, title, message, type, targetId) VALUES (?, ?, ?, ?, ?)');
    for (const admin of admins) {
      notifyStmt.run(admin.id, 'دفعة جديدة', `تم إستلام دفعة للحجز التابع لـ ${existing.name}`, 'financial', 'booking-' + id.toString());
    }
    // Notify location_owner
    const activityData = db.prepare('SELECT locationId FROM activities WHERE id = ?').get(existing.activityId) as any;
    if (activityData?.locationId) {
      const owners = db.prepare('SELECT id FROM staff WHERE role = ? AND locationId = ?').all('location_owner', activityData.locationId) as any[];
      for (const owner of owners) {
        notifyStmt.run(owner.id, 'دفعة جديدة', `تم إستلام دفعة للحجز التابع لـ ${existing.name}`, 'financial', 'booking-' + id.toString());
      }
    }
  }

  logAudit(req.user!.id, 'update', 'bookings', id, req.body);
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
  res.json(booking);
});

// PUT /api/bookings/:id/pay
router.put('/:id/pay', requireAuth, (req: AuthRequest, res) => {
  const { id } = req.params;
  const { paidAmount } = req.body;

  db.prepare('UPDATE bookings SET isPaid = 1, paidAmount = ? WHERE id = ?').run(paidAmount || 0, id);
  logAudit(req.user!.id, 'update', 'bookings', id, { action: 'payment', paidAmount });

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
  res.json(booking);
});

// DELETE /api/bookings/:id
router.delete('/:id', requireAuth, (req: AuthRequest, res) => {
  const existing = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'الحجز غير موجود' });

  db.prepare('DELETE FROM bookings WHERE id = ?').run(req.params.id);
  logAudit(req.user!.id, 'delete', 'bookings', req.params.id);
  res.json({ success: true });
});

export default router;
