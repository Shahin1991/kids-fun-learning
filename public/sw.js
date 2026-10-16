// scripts/stamp-sw.mjs fills in VERSION (a new one per build, so old caches are dropped) and the precache list.
const VERSION = "__BUILD_ID__";
const CACHE = `kids-hub-${VERSION}`;
const PRECACHE = ["/offline", ...__PRECACHE__];

self.addEventListener("install", (event) => {
  // One missing file must not fail the whole install, so each URL is cached on its own.
  event.waitUntil(caches.open(CACHE).then((c) => Promise.all([...new Set(PRECACHE)].map((u) => c.add(u).catch(() => {})))));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("kids-hub-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

const put = (req, res) => {
  if (!res.ok || res.type === "opaque") return;
  const copy = res.clone();
  caches.open(CACHE).then((c) => c.put(req, copy));
};

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    // Network first so updates show up; offline, fall back to the precached page (with or without a trailing slash).
    event.respondWith(
      fetch(req)
        .then((res) => {
          put(req, res);
          return res;
        })
        .catch(async () => {
          const path = url.pathname.replace(/\/+$/, "") || "/";
          return (
            (await caches.match(req, { ignoreSearch: true })) ||
            (await caches.match(path)) ||
            (await caches.match(`${path}.html`)) ||
            (await caches.match("/offline"))
          );
        }),
    );
    return;
  }

  // Static assets and RSC payloads: cache first. RSC requests carry a cache-busting ?_rsc= query, so ignore the search.
  const ignoreSearch = url.pathname.endsWith(".txt");
  event.respondWith(
    caches.match(req, { ignoreSearch }).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          put(req, res);
          return res;
        }),
    ),
  );
});
