/**
 * BOOTSTRAP PRIMARY ADMIN
 * -----------------------
 * Creates (or updates) a Firebase Auth user with role = super_admin and also
 * writes the matching Firestore 'users' profile doc (doc id == Auth uid).
 *
 * This is the entry point the owner uses to mint their first administrator
 * after going live. Prefer this over trusting an existing legacy account.
 *
 * Usage:
 *   FIREBASE_SERVICE_ACCOUNT_PATH="./hossammansourweb-9489f-firebase-adminsdk-fbsvc-1b0dbe2bbd.json" \
 *     ADMIN_EMAIL="admin@hossammansour.clinic" \
 *     ADMIN_PASSWORD="A-Strong-Password!" \
 *     ADMIN_NAME="د. حسام منصور (الإدارة العليا)" \
 *     ADMIN_PHONE="01100171817" \
 *     npx tsx scripts/bootstrap-admin.ts
 *
 * SAFE TO RE-RUN — upserts by email.
 */
import { db as firestore, firebaseAuth } from '../server/firebase.ts';

const email = (process.env.ADMIN_EMAIL || 'admin@hossammansour.clinic').trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD || 'Admin@12345';
const name = process.env.ADMIN_NAME || 'الإدارة العليا';
const phone = process.env.ADMIN_PHONE || '01100171817';

async function main() {
  let uid: string;
  try {
    const existing = await firebaseAuth().getUserByEmail(email);
    await firebaseAuth().updateUser(existing.uid, { password, displayName: name });
    uid = existing.uid;
    console.log('Updated existing Auth user', uid);
  } catch {
    const rec = await firebaseAuth().createUser({ email, password, displayName: name });
    uid = rec.uid;
    console.log('Created Auth user', uid);
  }

  await firebaseAuth().setCustomUserClaims(uid, { role: 'super_admin' });

  const profile = {
    id: uid,
    name,
    phone,
    email,
    role: 'super_admin',
    gender: 'male',
    age: 0,
    createdAt: new Date().toISOString(),
    isPrimaryAdmin: true,
  };
  await firestore().collection('users').doc(uid).set(profile, { merge: true });

  console.log('✅ Primary admin ready:');
  console.log('   email   :', email);
  console.log('   name    :', name);
  console.log('   role    : super_admin (custom claim + users doc)');
}

main().catch(err => {
  console.error('\n❌ bootstrap failed:', err.message);
  process.exit(1);
});