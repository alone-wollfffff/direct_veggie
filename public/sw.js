/* eslint-disable no-restricted-globals */
// ─────────────────────────────────────────────────────────────
//  Veggie Direct — Service Worker v2
//
//  Strategy:
//  • App shell (HTML, JS, CSS) → Cache-first, update in background
//  • Firebase / API calls      → Network-first, cache as fallback
//  • Everything else           → Network-first, cache if successful
//
//  Version bump this cache name whenever you deploy a new build
//  so old caches are cleared automatically.
// ─────────────────────────────────────────────────────────────

const CACHE_NAME    = "veggie-direct-v2";
const APP_SHELL_URL = "/";

// ── INSTALL: cache the app shell entry point ──────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([APP_SHELL_URL, "/manifest.json"]);
    })
  );
  // Take control immediately — don't wait for old SW to die
  self.skipWaiting();
});

// ── ACTIVATE: delete old version caches ──────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── FETCH ─────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and browser-extension requests
  if (request.method !== "GET") return;
  if (!url.protocol.startsWith("http")) return;

  // ── Firebase / Google APIs → Network first, no caching ──
  const isFirebase =
    url.hostname.includes("firestore.googleapis.com") ||
    url.hostname.includes("firebase.googleapis.com") ||
    url.hostname.includes("identitytoolkit.googleapis.com") ||
    url.hostname.includes("securetoken.googleapis.com") ||
    url.hostname.includes("firebaseapp.com");

  if (isFirebase) {
    event.respondWith(fetch(request));
    return;
  }

  // ── Google Fonts → Cache first (they rarely change) ─────
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            return response;
          })
      )
    );
    return;
  }

  // ── App HTML (navigation requests) → Cache first, then network ──
  // This is what makes the app load instantly after first visit.
  if (request.mode === "navigate") {
    event.respondWith(
      caches.match(APP_SHELL_URL).then(
        (cached) => cached || fetch(request)
      )
    );
    return;
  }

  // ── Static assets (JS, CSS, images) → Cache first ───────
  // React's hashed build files (main.abc123.js) are safe to cache forever.
  const isStatic =
    url.pathname.startsWith("/static/") ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|ico|webp|woff2?|ttf)$/);

  if (isStatic) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          })
      )
    );
    return;
  }

  // ── Everything else → Network first ─────────────────────
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// ── PUSH NOTIFICATIONS (future use) ──────────────────────────
// Uncomment when you add FCM push notifications:
// self.addEventListener("push", (event) => { ... });
