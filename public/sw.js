// Minimal service worker for PWA install support.
// Claude Monitor is a local dashboard — no offline caching needed.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim())
);
