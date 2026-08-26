import { getAuth } from 'firebase/auth';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
  fetchSignInMethodsForEmail,
} from 'firebase/auth';

// Public OAuth Client ID (safe to ship to the browser).
export const GOOGLE_CLIENT_ID =
  '180761581589-2jg9v4g0cthh6msjknebugp356q815gn.apps.googleusercontent.com';

// ---------- Google Identity Services (One Tap) ----------
let gisLoaded = false;
let gisLoadingPromise: Promise<void> | null = null;

export function loadGoogleIdentityServices(): Promise<void> {
  if (gisLoaded) return Promise.resolve();
  if (gisLoadingPromise) return gisLoadingPromise;
  gisLoadingPromise = new Promise<void>((resolve, reject) => {
    if (document.getElementById('google-identity-services')) {
      gisLoaded = true;
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.id = 'google-identity-services';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      gisLoaded = true;
      resolve();
    };
    script.onerror = () => reject(new Error('تعذر تحميل خدمة تسجيل الدخول عبر Google.'));
    document.head.appendChild(script);
  });
  return gisLoadingPromise;
}

// ---------- Firebase Google sign-in ----------
export function signInWithGooglePopup() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return signInWithPopup(getAuth(), provider);
}

export function signInWithGoogleCredential(credential: string) {
  const provider = GoogleAuthProvider.credential(credential);
  return signInWithCredential(getAuth(), provider);
}

export function getSignInMethodsForEmail(email: string) {
  return fetchSignInMethodsForEmail(getAuth(), email);
}

// ---------- One Tap ----------
let gisInitialized = false;
let gisCredentialHandler: ((credential: string) => void) | null = null;

export async function initOneTap(handlers: {
  onCredential: (credential: string) => void;
  onError?: (reason: string) => void;
}): Promise<boolean> {
  try {
    await loadGoogleIdentityServices();
  } catch {
    handlers.onError?.('gis-unavailable');
    return false;
  }
  const g = (window as any).google;
  if (!g?.accounts?.id) {
    handlers.onError?.('gis-unavailable');
    return false;
  }
  // Keep the latest handler so re-initializing isn't required (avoids the
  // "google.accounts.id.initialize() is called multiple times" warning).
  gisCredentialHandler = handlers.onCredential;
  if (!gisInitialized) {
    g.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      use_fedcm_for_prompt: true,
      callback: (resp: any) => {
        if (resp?.credential) gisCredentialHandler?.(resp.credential);
        else handlers.onError?.('no-credential');
      },
    });
    gisInitialized = true;
  }
  return true;
}

export function promptOneTap(onNotShown?: () => void) {
  const g = (window as any).google;
  if (!g?.accounts?.id) {
    onNotShown?.();
    return;
  }
  // Call prompt() WITHOUT a status/moment callback to stay FedCM-compliant and
  // avoid the "uses a deprecated One Tap prompt UI status method" warning.
  g.accounts.id.prompt();
}

export function cancelOneTap() {
  (window as any).google?.accounts?.id?.cancel?.();
}

// ---------- Error translation (Arabic, consistent with app) ----------
export function translateGoogleError(e: any): string {
  const code = e?.code || '';
  switch (code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'تم إلغاء تسجيل الدخول عبر Google.';
    case 'auth/popup-blocked':
      return 'تم حظر نافذة تسجيل الدخول، يرجى السماح بالنوافذ المنبثقة.';
    case 'auth/network-request-failed':
      return 'تعذر الاتصال بالشبكة، حاول مرة أخرى.';
    case 'auth/account-exists-with-different-credential':
      return 'يوجد حساب بهذا البريد بطريقة دخول أخرى، يرجى تسجيل الدخول بالبريد وكلمة المرور.';
    case 'auth/invalid-credential':
    case 'auth/credential-already-in-use':
      return 'بيانات اعتماد Google غير صالحة أو مرتبطة بحساب آخر.';
    case 'auth/operation-not-allowed':
      return 'تسجيل الدخول عبر Google غير مفعل في إعدادات Firebase.';
    default:
      return e?.message || 'فشل تسجيل الدخول عبر Google.';
  }
}
