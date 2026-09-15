/* Public shell only. Never cache API responses, POSTs, map tiles, exports or IndexedDB data. */
importScripts("/offline-assets.js");
const SHELL = "vaelora-shell-" + self.VAELORA_ASSETS.version;
const allowed = (url) =>
  url.origin === self.location.origin &&
  (url.pathname.startsWith("/_next/static/") ||
    self.VAELORA_ASSETS.files.includes(url.pathname) ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest");
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL).then(async (cache) => {
      const response = await fetch("/", { cache: "reload" });
      if (!response.ok) throw new Error("Shell unavailable");
      await cache.put("/", response.clone());
      await cache.addAll([
        ...self.VAELORA_ASSETS.files,
        "/manifest.webmanifest",
        "/icons/icon-192.png",
        "/icons/icon-512.png",
        "/icons/icon-maskable.png",
      ]);
    }),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("vaelora-shell-") && k !== SHELL)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (event) => {
  const request = event.request,
    url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (request.mode === "navigate" && url.pathname === "/") {
    event.respondWith(
      fetch(request).catch(
        async () => (await caches.match("/")) || Response.error(),
      ),
    );
    return;
  }
  if (allowed(url))
    event.respondWith(
      caches.open(SHELL).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      }),
    );
});
