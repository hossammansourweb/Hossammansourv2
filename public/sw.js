/* Service Worker for عيادة د. حسام منصور — conservative, privacy-safe caching.
   - Never caches /api/* (serverless functions).
   - Never caches cross-origin requests (Firebase, Google Sign-In, fonts, etc.).
   - Never caches authenticated patient/admin data — Firebase uses cross-origin SDK,
     and our own API is under /api which is excluded.
   - Navigation uses network-first with an app-shell fallback (offline support).
   - Static same-origin assets use stale-while-revalidate.
*/
const VERSION = 'v1';
const STATIC_CACHE = `clinic-static-${VERSION}`;
const SHELL_CACHE = `clinic-shell-${VERSION}`;
const APP_SHELL = ['/', '/index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.startsWith(`clinic-${VERSION}`) && k.startsWith('clinic-'))
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isStaticAsset(url) {
  if (!isSameOrigin(url)) return false;
  const p = url.pathname;
  if (p === '/' || p === '/index.html' || p === '/manifest.webmanifest' || p === '/sw.js') return false;
  return (
    p.startsWith('/assets/') ||
    /\.(?:js|css|png|jpe?g|gif|svg|webp|woff2?|ttf|eot|ico|json)$/i.test(p)
  );
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Never touch API routes or anything not same-origin (Firebase/Google/etc).
  if (!isSameOrigin(url) || url.pathname.startsWith('/api/')) return;

  // App navigations: network-first, fall back to cached shell when offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put('/index.html', copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('/index.html').then((r) => r || caches.match('/')))
    );
    return;
  }

  // Static assets: stale-while-revalidate.
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            if (res && res.status === 200) {
              const copy = res.clone();
              caches.open(STATIC_CACHE).then((c) => c.put(req, copy)).catch(() => {});
            }
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // Everything else same-origin (unmatched): passthrough.
});
