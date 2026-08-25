/**
 * SEED / MIGRATION SCRIPT
 * -----------------------
 * Reads the legacy JSON database (data/clinic_db.json) and uploads everything
 * to Cloud Firestore. For USERS it also creates Firebase Auth accounts and sets
 * role custom claims, because bcrypt password hashes CANNOT be transferred to
 * Firebase Auth — every legacy user is given a documented reset password.
 *
 * SAFE TO RE-RUN: idempotent (upserts by existing Auth email).
 *
 * Usage:
 *   FIREBASE_SERVICE_ACCOUNT_PATH="./hossammansourweb-9489f-firebase-adminsdk-fbsvc-1b0dbe2bbd.json" \
 *     npx tsx scripts/seed.ts
 *
 * NOTE: This is a privileged, one-time admin tool. It talks to the real Firebase
 * project via the Admin SDK and MUST never be bundled into the app or shipped
 * to a browser.
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { db as firestore, firebaseAuth } from '../server/firebase.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA_FILE = path.resolve(ROOT, 'data', 'clinic_db.json');

// Temporary password for legacy users so they can sign in for the first time.
// They MUST reset it afterwards (bcrypt hashes cannot be migrated to Firebase).
const RESET_PASSWORD = process.env.LEGACY_RESET_PASSWORD || 'Admin@12345';

interface SeedDb {
  users?: any[];
  branches?: any[];
  services?: any[];
  appointments?: any[];
  workingHours?: any[];
  exceptions?: any[];
  doctorProfile?: any;
  reviews?: any[];
  faqs?: any[];
  announcements?: any[];
  auditLogs?: any[];
  notifications?: any[];
}

async function upsertUser(user: any): Promise<string> {
  const email = (user.email || '').trim().toLowerCase();
  if (!email) {
    throw new Error(`Seed user without email cannot become an Auth user: ${user.name}`);
  }
  const role = user.role || 'patient';

  let uid: string;
  try {
    const existing = await firebaseAuth().getUserByEmail(email);
    await firebaseAuth().updateUser(existing.uid, {
      displayName: user.name,
      password: RESET_PASSWORD,
    });
    uid = existing.uid;
  } catch {
    const rec = await firebaseAuth().createUser({
      email,
      password: RESET_PASSWORD,
      displayName: user.name,
    });
    uid = rec.uid;
  }

  await firebaseAuth().setCustomUserClaims(uid, { role });
  return uid;
}

async function ensureHealthy(): Promise<void> {
  await firestore().collection('__health').doc('seed').get();
}

async function main() {
  console.log('Loading legacy data from', DATA_FILE);
  const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) as SeedDb;
  await ensureHealthy();

  // ---------- USERS (Firestore doc id == Firebase Auth uid) ----------
  const users = raw.users || [];
  console.log(`\n[users] migrating ${users.length} legacy accounts -> Firebase Auth`);
  for (const u of users) {
    const uid = await upsertUser(u);
    const { passwordHash: _omit, ...profile } = u;
    await firestore().collection('users').doc(uid).set({
      ...profile,
      id: uid,
      role: u.role || 'patient',
    });
    console.log(`  OK ${(u.email || u.name).padEnd?.(30) || ''} -> uid ${uid} (role: ${u.role || 'patient'})`);
  }

  // ---------- Plain collections keyed by existing id ----------
  const plainCols = [
    'branches',
    'services',
    'appointments',
    'workingHours',
    'exceptions',
    'reviews',
    'faqs',
    'announcements',
  ] as const;

  for (const col of plainCols) {
    const items = (raw as any)[col] || [];
    if (col === 'appointments') {
      for (const a of items) {
        if (!a.bookingNumber_lower && a.bookingNumber) {
          a.bookingNumber_lower = String(a.bookingNumber).toLowerCase();
        }
      }
    }
    for (const item of items) {
      const id = item.id || `${col}_${Math.random().toString(36).slice(2, 8)}`;
      await firestore().collection(col).doc(String(id)).set(item);
    }
    console.log(`  [${col}] wrote ${items.length}`);
  }

  // ---------- doctorProfile -> fixed 'main' doc ----------
  if (raw.doctorProfile) {
    await firestore().collection('doctorProfile').doc('main').set(raw.doctorProfile);
    console.log('[doctorProfile] wrote main');
  }

  // ---------- auditLogs & notifications -> auto-id docs ----------
  for (const [col, field] of [
    ['auditLogs', 'timestamp'],
    ['notifications', 'createdAt'],
  ] as const) {
    const items = (raw as any)[col] || [];
    for (const item of items) {
      const copy = { ...item };
      if (typeof copy[field] === 'string') copy[field] = new Date(copy[field]);
      await firestore().collection(col).add(copy);
    }
    console.log(`[${col}] wrote ${items.length} (via add())`);
  }

  console.log('\n✅ Seed complete.');
  console.log('Legacy users can sign in with the temporary password:', RESET_PASSWORD);
  console.log('Have each user change it after first login.');
  console.log('To mint a brand-new primary admin, run: npx tsx scripts/bootstrap-admin.ts');
}

main().catch(err => {
  console.error('\n❌ Seed failed:', err.message);
  process.exit(1);
});