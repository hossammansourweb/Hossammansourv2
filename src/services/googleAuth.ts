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
// Tracks whether One Tap has been permanently disabled for this session
// (e.g. user dismissed via the button, or the caller opted out). Once true,
// we never call prompt() again — avoids console spam and repeated UI
// interruptions. We do NOT set this based on Google's deprecated moment
// callback (isNotDisplayed/isSkipped/isDismissed), which Google warns will
// stop functioning as FedCM becomes mandatory.
let oneTapDisabled = false;

export function isOneTapDisabled(): boolean {
  return oneTapDisabled;
}

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
      // Use the modern FedCM path. Google's library now handles FedCM
      // availability internally — when FedCM is disabled (site settings,
      // previous user action) it falls back to the legacy flow without
      // surfacing the deprecated `isNotDisplayed`/`isSkipped`/`isDismissed`
      // moment callbacks. Setting this to `false` would also work, but
      // `true` is the recommended path going forward.
      use_fedcm_for_prompt: true,
      // Don't auto-cancel when the user clicks outside — let them dismiss
      // explicitly so we don't lose the prompt mid-interaction.
      cancel_on_tap_outside: false,
      // Intelligent Tracking Prevention (Safari/Firefox) support.
      itp_support: true,
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
  if (oneTapDisabled) {
    onNotShown?.();
    return;
  }
  const g = (window as any).google;
  if (!g?.accounts?.id) {
    onNotShown?.();
    return;
  }
  // Per Google's current FedCM guidance, do NOT pass the deprecated moment
  // callback (notification => notification.isNotDisplayed() / .isSkipped() /
  // .isDismissed()). Those methods are slated to stop functioning when FedCM
  // becomes mandatory. The library now logs the
  // "uses one of the Google One Tap prompt UI status methods" warning when
  // they are used.
  //
  // Instead, we just call prompt() and rely on:
  //   - The `callback` above for successful sign-ins.
  //   - The standard "Continue with Google" button as the always-available
  //     fallback (it uses Firebase Auth popup, independent of One Tap / FedCM).
  //   - `cancelOneTap()` from the React effect cleanup to abort the prompt
  //     when the auth modal unmounts.
  g.accounts.id.prompt();
}

export function cancelOneTap() {
  (window as any).google?.accounts?.id?.cancel?.();
}

export function disableOneTap() {
  // Called by the caller when it wants to stop prompting (e.g. the user
  // clicked a "Not now" affordance). We don't infer this from Google's
  // moment callback because those methods are deprecated.
  oneTapDisabled = true;
}

export function resetOneTap() {
  // Allow callers (e.g. on logout) to re-enable One Tap for the next session.
  oneTapDisabled = false;
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
