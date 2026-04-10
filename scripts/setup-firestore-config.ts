/**
 * Setup Script — Run ONCE to initialize Firestore config
 * 
 * [SEC-05] This creates config/admins with admin emails in Firestore.
 * 
 * Usage: npx ts-node scripts/setup-firestore-config.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

async function setupConfig() {
  console.log('🔧 Setting up Firestore config...');

  // 1. Create admin emails config
  await db.doc('config/admins').set({
    emails: [
      'aboodafaneh13@gmail.com',
      'abd0175149@gmail.com'
    ],
    updatedAt: FieldValue.serverTimestamp()
  });
  console.log('✅ config/admins created');

  // 2. Create default app settings
  await db.doc('config/app').set({
    currency: 'د.أ',
    appName: 'Mafia Club',
    maxLoginAttempts: 5,
    lockoutDurationMinutes: 15,
    sessionTTLHours: 24,
    updatedAt: FieldValue.serverTimestamp()
  });
  console.log('✅ config/app created');

  console.log('\n🎉 Setup complete!');
  process.exit(0);
}

setupConfig().catch((err) => {
  console.error('❌ Setup failed:', err);
  process.exit(1);
});
