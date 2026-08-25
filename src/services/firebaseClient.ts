// Client-safe Firebase configuration. These values are PUBLIC browser config
// and are safe to ship to the client. Never put Admin SDK credentials here.
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDKGh6b1MFe1FLaT71Eq1z9wIPN6_4kyTI',
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    'hossammansourweb-9489f.firebaseapp.com',
  projectId:
    import.meta.env.VITE_FIREBASE_PROJECT_ID || 'hossammansourweb-9489f',
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    'hossammansourweb-9489f.firebasestorage.app',
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '180761581589',
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ||
    '1:180761581589:web:56b2e57377c9db6559d61c',
};

export default config;

export const firebaseConfig = config;