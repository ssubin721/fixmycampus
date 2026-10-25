const CACHE_NAME = "fixmycampus-v4";

// Static files required for offline access & PWA app install shell
const APP_SHELL = [
  "/",
  "/index.html",
  "/welcome.html",
  "/login.html",
  "/register.html",
  "/student-home.html",
  "/report-complaint.html",
  "/my-complaints.html",
  "/complaint-details.html",
  "/profile.html",
  "/admin-login.html",
  "/admin-dashboard.html",
  "/all-complaints.html",
  "/complaint-management.html",
  "/admin-users.html",
  "/admin-categories.html",
  "/css/style.css",
  "/js/api.js",
  "/js/validation.js",
  "/manifest.json",
  "/favicon.ico",
  "/icons/logo.png",
  "/icons/favicon.png",
  "/icons/apple-touch-icon.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

// Install Service Worker
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );

  self.skipWaiting();
});

// Activate Service Worker & purge old v1/v2 caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );

  self.clients.claim();
});

// Fetch Event
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Ignore non-http(s) requests
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return;
  }

  // Ignore non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Always fetch API and uploaded images from network
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/uploads/")
  ) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({
            message: "You appear to be offline.",
          }),
          {
            status: 503,
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
      })
    );

    return;
  }

  // Network First for HTML, Manifest, and App Icons
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type === "basic"
        ) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(request);
      })
  );
});