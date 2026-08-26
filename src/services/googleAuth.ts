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
// (e.g. user dismissed, browser blocked FedCM, origin not registered).
// Once true, we never call prompt() again — avoids console spam and
// repeated UI interruptions.
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
      // Don't force FedCM — let the browser use it when available and fall
      // back to the legacy cookie-based flow otherwise. Forcing FedCM
      // causes hard `NetworkError: retrieving a token` failures in browsers
      // where FedCM is disabled (site settings, previous user action, or
      // unsupported environments), which Google logs to the console before
      // our code can react.
      use_fedcm_for_prompt: false,
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
  // The moment callback is the ONLY way to learn why One Tap didn't show.
  // Without it, Google's library logs the failure to the console and our
  // onError handler is never called — which is exactly what's happening
  // now. We inspect the reason and disable One Tap for the rest of the
  // session on any non-recoverable failure.
  g.accounts.id.prompt((notification: any) => {
    if (notification.isNotDisplayed?.()) {
      const reason: string = notification.getNotDisplayedReason?.() || 'unknown';
      // Non-recoverable for this session: don't keep trying.
      oneTapDisabled = true;
      // Known-benign reasons — log at info level only, never as an error.
      if (
        reason === 'browser_not_supported' ||
        reason === 'unregistered_origin' ||
        reason === 'invalid_client' ||
        reason === 'fedcm_disabled' ||
        reason === 'fedcm_unavailable' ||
        reason === 'missing_client_id' ||
        reason === 'opt_out' ||
        reason === 'suppressed_by_user'
      ) {
        onNotShown?.();
        return;
      }
      onNotShown?.();
      return;
    }
    if (notification.isSkipped?.()) {
      const reason: string = notification.getSkippedReason?.() || 'unknown';
      if (reason === 'user_cancel' || reason === 'tap_outside') {
        // User explicitly dismissed — stop trying for this session.
        oneTapDisabled = true;
      }
      return;
    }
    if (notification.isDismissed?.()) {
      const reason: string = notification.getDismissedReason?.() || 'unknown';
      if (
        reason === 'credential_returned' ||
        reason === 'cancel_called' ||
        reason === 'flow_restarted'
      ) {
        return;
      }
      // User dismissed via UI — don't auto-prompt again this session.
      oneTapDisabled = true;
    }
  });
}

export function cancelOneTap() {
  (window as any).google?.accounts?.id?.cancel?.();
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
