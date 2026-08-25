import {
  initializeApp,
  cert,
  getApps,
  type App,
} from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';

// Initialize Firebase Admin SDK once.
// Credentials are read from FIREBASE_SERVICE_ACCOUNT (JSON string) in production,
// or from the local service-account JSON file during development.
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

function loadCredentials() {
  if (serviceAccount) {
    try {
      return JSON.parse(serviceAccount);
    } catch {
      throw new Error('FIREBASE_SERVICE_ACCOUNT is set but not valid JSON.');
    }
  }
  if (serviceAccountPath) {
    if (!fs.existsSync(serviceAccountPath)) {
      throw new Error(`Service-account file not found at ${serviceAccountPath}`);
    }
    try {
      return JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    } catch {
      throw new Error(`FIREBASE_SERVICE_ACCOUNT_PATH is set but not valid JSON: ${serviceAccountPath}`);
    }
  }
  throw new Error(
    'Firebase Admin credentials missing. Set FIREBASE_SERVICE_ACCOUNT (JSON) or FIREBASE_SERVICE_ACCOUNT_PATH.'
  );
}

let app: App | undefined;

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
export const db = () => getFirestore(getFirebase());