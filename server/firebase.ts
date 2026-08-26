import {
  initializeApp,
  cert,
  getApps,
  type App,
} from 'firebase-admin/app';
import { initializeFirestore, getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Firebase Admin SDK once.
// Credentials are read from FIREBASE_SERVICE_ACCOUNT (JSON string) in production,
// or from the local service-account JSON file during development.
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
const defaultServiceAccountPath = path.resolve(
  process.cwd(),
  'hossammansourweb-9489f-firebase-adminsdk-fbsvc-1b0dbe2bbd.json'
);

function loadCredentials() {
  if (serviceAccount) {
    try {
      return JSON.parse(serviceAccount);
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
    'Firebase Admin credentials missing. Set FIREBASE_SERVICE_ACCOUNT (JSON) or FIREBASE_SERVICE_ACCOUNT_PATH.'
  );
}

let app: App | undefined;
let dbInstance: ReturnType<typeof initializeFirestore> | undefined;

function getFirebase(): App {
  if (!app) {
    const existing = getApps();
    app = existing.length === 0 ? initializeApp({ credential: cert(loadCredentials()) }) : existing[0];
  }
  return app;
}

export function getFirebaseApp(): App {
  return getFirebase();
}

export const firebaseAuth = () => getAuth(getFirebase());

/**
 * Returns the Firestore instance with `ignoreUndefinedProperties: true` so that
 * optional fields (e.g. `gender`, `age`, `email`) can be omitted from write
 * payloads without raising
 *   "Cannot use 'undefined' as a Firestore value (found in field ...)"
 * For new apps we use `initializeFirestore` (which accepts settings); for apps
 * that were already initialized elsewhere (HMR, tests) we fall back to the
 * default `getFirestore` and apply the same settings at runtime.
 */
export const db = () => {
  if (dbInstance) return dbInstance;
  try {
    dbInstance = initializeFirestore(getFirebase(), {
      ignoreUndefinedProperties: true,
    });
  } catch {
    // App already initialized — get the default instance and apply the same
    // settings so the rest of the code path behaves identically.
    dbInstance = getFirestore(getFirebase());
    try {
      dbInstance.settings({ ignoreUndefinedProperties: true });
    } catch {
      // Settings can only be set once; ignore if already configured.
    }
  }
  return dbInstance;
};