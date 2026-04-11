import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'mafia.db');
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS staff (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    displayName TEXT NOT NULL,
    role TEXT CHECK(role IN ('admin','manager')) NOT NULL DEFAULT 'manager',
    createdAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    date TEXT NOT NULL,
    description TEXT DEFAULT '',
    basePrice REAL DEFAULT 0,
    status TEXT CHECK(status IN ('planned','active','completed','cancelled')) DEFAULT 'planned',
    createdAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    activityId INTEGER REFERENCES activities(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT DEFAULT '',
    count INTEGER DEFAULT 1,
    isPaid INTEGER DEFAULT 0,
    paidAmount REAL DEFAULT 0,
    receivedBy TEXT DEFAULT '',
    isFree INTEGER DEFAULT 0,
    notes TEXT DEFAULT '',
    createdAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS costs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    activityId INTEGER REFERENCES activities(id) ON DELETE SET NULL,
    item TEXT NOT NULL,
    amount REAL DEFAULT 0,
    date TEXT NOT NULL,
    paidBy TEXT DEFAULT '',
    type TEXT CHECK(type IN ('activity','general')) DEFAULT 'general'
  );

  CREATE TABLE IF NOT EXISTS foundational_costs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item TEXT NOT NULL,
    amount REAL DEFAULT 0,
    paidBy TEXT DEFAULT '',
    source TEXT DEFAULT '',
    date TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER REFERENCES staff(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT DEFAULT '',
    type TEXT DEFAULT 'new_booking',
    read INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS user_settings (
    userId INTEGER PRIMARY KEY REFERENCES staff(id) ON DELETE CASCADE,
    newBooking INTEGER DEFAULT 1,
    upcomingActivity INTEGER DEFAULT 1,
    costAlert INTEGER DEFAULT 1,
    dashboardLayout TEXT DEFAULT '["revenue","costs","profit","bookings","upcoming"]'
  );

  CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    mapUrl TEXT DEFAULT '',
    offers TEXT DEFAULT '[]',
    createdAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    action TEXT,
    entity TEXT,
    entityId TEXT,
    details TEXT,
    timestamp TEXT DEFAULT (datetime('now'))
  );
`);

// Safe migrations for existing tables
try { db.exec('ALTER TABLE activities ADD COLUMN locationId INTEGER REFERENCES locations(id) ON DELETE SET NULL'); } catch (e) { /* Column already exists */ }
try { db.exec('ALTER TABLE activities ADD COLUMN driveLink TEXT DEFAULT ""'); } catch (e) { /* Column already exists */ }
// Safe migrations for staff table
try { db.exec('ALTER TABLE staff ADD COLUMN photoURL TEXT DEFAULT NULL'); } catch (e) { /* Column already exists */ }
try { db.exec('ALTER TABLE staff ADD COLUMN permissions TEXT DEFAULT \'["activities","bookings","finances","locations"]\''); } catch (e) { /* Column already exists */ }
try { db.exec('ALTER TABLE staff ADD COLUMN lastLogin TEXT DEFAULT NULL'); } catch (e) { /* Column already exists */ }
// Safe migration for notifications
try { db.exec('ALTER TABLE notifications ADD COLUMN targetId TEXT DEFAULT NULL'); } catch (e) { /* Column already exists */ }

// Seed default admin if none exists
const adminExists = db.prepare('SELECT id FROM staff WHERE role = ?').get('admin');
if (!adminExists) {
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO staff (username, password, displayName, role) VALUES (?, ?, ?, ?)').run(
    'admin', hash, 'المدير العام', 'admin'
  );
  console.log('✅ Default admin created (admin / admin123)');
}

export default db;

// Helper: log audit
export function logAudit(userId: number | null, action: string, entity: string, entityId: string | number, details?: any) {
  db.prepare('INSERT INTO audit_log (userId, action, entity, entityId, details) VALUES (?, ?, ?, ?, ?)').run(
    userId, action, entity, String(entityId), details ? JSON.stringify(details) : null
  );
}
