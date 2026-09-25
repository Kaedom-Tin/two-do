// Two Do — app shell service worker.
// Bump CACHE_NAME whenever index.html or any shell file changes, so clients pick up
// the new version instead of serving a stale cached copy indefinitely.
const CACHE_NAME = "two-do-shell-v16";

const SHELL_PATHS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-any-192.png",
  "./icon-any-512.png",
  "./icon-maskable-192.png",
  "./icon-maskable-512.png"
];
const CDN_URLS = [
  "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js",
  "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js",
  "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js"
];
const SHELL_URLS = SHELL_PATHS.map((p) => new URL(p, self.location).href).concat(CDN_URLS);

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Only ever handle the app shell itself (this file's own HTML/JS/icons, plus the
  // pinned Firebase SDK files). Everything else — Firebase's live database and auth
  // traffic in particular — passes straight through untouched, so real-time sync
  // and sign-in keep working exactly as normal.
  if (event.request.method !== "GET" || !SHELL_URLS.includes(event.request.url)) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
