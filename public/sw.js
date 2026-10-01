/*
 * Service worker : permet à l'app de s'ouvrir et d'afficher les derniers
 * matchs même sans réseau (métro, avion, RER sans 4G…).
 * Change VERSION pour forcer une mise à jour des fichiers en cache.
 */
const VERSION = "v1";
const SHELL = `shell-${VERSION}`;
const DATA = `data-${VERSION}`;
const IMAGES = `images-${VERSION}`;

const PRECACHE = ["/clubs", "/selections", "/manifest.webmanifest", "/icon-192.png", "/apple-touch-icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.endsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw new Error("offline");
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok || response.type === "opaque") {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // Données des matchs : réseau d'abord, cache si hors ligne
  if (url.origin === location.origin && url.pathname.startsWith("/api/matches")) {
    event.respondWith(networkFirst(request, DATA));
    return;
  }

  // Pages : réseau d'abord, sinon dernière version enregistrée
  if (request.mode === "navigate") {
    event.respondWith(
      networkFirst(request, SHELL).catch(async () => (await caches.match("/clubs")) ?? Response.error()),
    );
    return;
  }

  // Fichiers JS/CSS de Next (noms versionnés, donc immuables)
  if (url.origin === location.origin && url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, SHELL));
    return;
  }

  // Logos des équipes
  if (request.destination === "image") {
    event.respondWith(cacheFirst(request, IMAGES).catch(() => Response.error()));
  }
});
