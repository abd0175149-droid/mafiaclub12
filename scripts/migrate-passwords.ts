/**
 * Password Migration Script — Run ONCE to hash existing plaintext passwords
 * 
 * [SEC-02] Migrates staff passwords from plaintext to bcrypt hashes.
 * 
 * Prerequisites: npm install bcryptjs
 * Usage: npx ts-node scripts/migrate-passwords.ts
 * 
 * ⚠️ WARNING: Back up your 'staff' collection first!
 */

import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import bcrypt from 'bcryptjs';

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();
const SALT_ROUNDS = 10;

async function migratePasswords() {
  console.log('🔐 Starting password migration...');
  
  const staffSnap = await db.collection('staff').get();
  let migrated = 0;
  let skipped = 0;

  for (const doc of staffSnap.docs) {
    const data = doc.data();
    const password = data.password;

    // Skip if already hashed (bcrypt hashes start with $2a$ or $2b$)
    if (password && (password.startsWith('$2a$') || password.startsWith('$2b$'))) {
      console.log(`  ⏭️  ${data.username} — already hashed, skipping`);
      skipped++;
      continue;
    }

    if (!password) {
      console.log(`  ⚠️  ${data.username} — no password field, skipping`);
      skipped++;
      continue;
    }

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    await doc.ref.update({ password: hash });
    console.log(`  ✅ ${data.username} — migrated`);
    migrated++;
  }

  console.log(`\n🎉 Migration complete: ${migrated} migrated, ${skipped} skipped`);
  process.exit(0);
}

migratePasswords().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
