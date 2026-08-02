const CACHE_NAME = "gymmi-shell-v1.5.1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./data-store.js",
  "./app.js",
  "./version.json",
  "./changelog.json",
  "./manifest.webmanifest",
  "./icon.svg",
  "./icons.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
    )),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request)),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "REFRESH_APP_SHELL") return;
  const replyPort = event.ports[0];
  const refresh = caches.open(CACHE_NAME).then((cache) => {
    const requests = APP_SHELL.map((path) => new Request(
      new URL(path, self.registration.scope),
      { cache: "reload" },
    ));
    return cache.addAll(requests);
  });

  event.waitUntil(
    refresh
      .then(() => replyPort?.postMessage({ ok: true }))
      .catch((error) => replyPort?.postMessage({ ok: false, error: error.message })),
  );
});
