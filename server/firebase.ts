import * as fs from 'fs';
import * as path from 'path';

// Initialize Firebase Admin SDK once.
// Credentials are read in this order:
//   1. FIREBASE_SERVICE_ACCOUNT_B64 — base64-encoded JSON (Vercel-friendly).
//   2. FIREBASE_SERVICE_ACCOUNT — raw JSON string.
//   3. FIREBASE_SERVICE_ACCOUNT_PATH — path to a JSON file (local dev only).
//   4. ./hossammansourweb-9489f-firebase-adminsdk-*.json if present in CWD.
const serviceAccountB64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
const defaultServiceAccountPath = path.resolve(
  process.cwd(),
  'hossammansourweb-9489f-firebase-adminsdk-fbsvc-1b0dbe2bbd.json'
);

function loadCredentials() {
  if (serviceAccountB64) {
    try {
      return JSON.parse(Buffer.from(serviceAccountB64, 'base64').toString('utf8'));
    } catch {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_B64 is set but is not valid base64-encoded JSON.');
    }
  }
  if (serviceAccountRaw) {
    try {
      return JSON.parse(serviceAccountRaw);
    } catch {
      throw new Error('FIREBASE_SERVICE_ACCOUNT is set but not valid JSON.');
    }
  }
  const credentialsPath = serviceAccountPath ||
    (fs.existsSync(defaultServiceAccountPath) ? defaultServiceAccountPath : undefined);

  if (credentialsPath) {
    if (!fs.existsSync(credentialsPath)) {
      throw new Error(`Service-account file not found at ${credentialsPath}`);
    }
    try {
      return JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    } catch {
      throw new Error(`FIREBASE_SERVICE_ACCOUNT_PATH is set but not valid JSON: ${credentialsPath}`);
    }
  }
  throw new Error(
    'Firebase Admin credentials missing. Set FIREBASE_SERVICE_ACCOUNT (JSON), FIREBASE_SERVICE_ACCOUNT_B64 (base64), or FIREBASE_SERVICE_ACCOUNT_PATH.'
  );
}

// DIAGNOSTIC: log the Admin SDK project_id once at cold start. NEVER log the
// full service account — only the public project_id and client_email (which
// are not secret). Helps verify the Admin SDK is initialised against the same
// Firebase project the client uses.
let _startupLogged = false;
function logStartupOnce() {
  if (_startupLogged) return;
  _startupLogged = true;
  try {
    const creds = loadCredentials();
    const adminProjectId = creds?.project_id || 'unknown';
    const adminClientEmail = creds?.client_email || 'unknown';
    // Expected client project id comes from VITE_FIREBASE_PROJECT_ID (build-time)
    // or the public firebaseClient fallback. We pass the client value through
    // build env at build time on Vercel; otherwise the bundled fallback is used.
    const expectedClientProjectId =
      process.env.VITE_FIREBASE_PROJECT_ID || 'hossammansourweb-9489f';
    const match = adminProjectId === expectedClientProjectId;
    console.log(
      `[firebase-admin] project_id=${adminProjectId} client_email=${adminClientEmail} ` +
        `expected_client_project_id=${expectedClientProjectId} match=${match}`
    );
    if (!match) {
      console.error(
        `[firebase-admin] PROJECT MISMATCH: admin=${adminProjectId} client=${expectedClientProjectId}. ` +
          'Tokens issued for the client project will be rejected by verifyIdToken.'
      );
    }
  } catch (e: any) {
    console.error(`[firebase-admin] startup log failed: ${e?.message || e}`);
  }
}

// firebase-admin uses dynamic requires that the Vercel (@vercel/node / ncc)
// bundler mangles when inlined, which crashes the function at MODULE LOAD time
// (Vercel then returns its default text/plain 500). Requiring the SDK through a
// non-statically-resolvable specifier forces the bundler to keep it external so
// it is loaded from node_modules at runtime — exactly how it runs in Node.
function loadAdminModule(subpath: string): any {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const spec = ['firebase-admin', subpath].filter(Boolean).join('/');
  // tslint:disable-next-line:no-var-requires
  return require(spec);
}

let app: any;
let dbInstance: any;

function getFirebase(): any {
  if (!app) {
    const adminApp = loadAdminModule('app');
    const { initializeApp, cert, getApps } = adminApp;
    const existing = getApps();
    app = existing.length === 0
      ? initializeApp({ credential: cert(loadCredentials()) })
      : existing[0];
    logStartupOnce();
  }
  return app;
}

export function getFirebaseApp(): any {
  return getFirebase();
}

export const firebaseAuth = () => {
  const { getAuth } = loadAdminModule('auth');
  return getAuth(getFirebase());
};

/**
 * Returns the Firestore instance with `ignoreUndefinedProperties: true` so that
 * optional fields can be omitted from write payloads without raising
 * "Cannot use 'undefined' as a Firestore value".
 */
export const db = () => {
  if (dbInstance) return dbInstance;
  const adminFirestore = loadAdminModule('firestore');
  const { initializeFirestore, getFirestore } = adminFirestore;
  try {
    dbInstance = initializeFirestore(getFirebase(), {});
    try {
      dbInstance.settings({ ignoreUndefinedProperties: true });
    } catch {
      // Settings can only be set once; ignore if already configured.
    }
  } catch {
    dbInstance = getFirestore(getFirebase());
    try {
      dbInstance.settings({ ignoreUndefinedProperties: true });
    } catch {
      // Settings can only be set once; ignore if already configured.
    }
  }
  return dbInstance;
};
