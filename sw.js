// sw.js — Service Worker Kamus Dayak Kanayatn / Ahe
const CACHE_NAME = 'kamus-dayak-cache-v2';
const OFFLINE_URLS = [
  '/kd/',
  '/kd/index.html',
  '/kd/style.css',
  '/kd/app.js',
  '/kd/manifest.json',
  '/kd/data-max.json',
  '/kd/favicon.ico',
  '/kd/icon-192.png',
  '/kd/icon-512.png'
];

// Saat instal — cache semua file penting
self.addEventListener('install', (event) => {
  console.log('[SW] Instalasi service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Menyimpan aset ke cache...');
      return cache.addAll(OFFLINE_URLS);
    })
  );
  self.skipWaiting();
});

// Saat aktif — hapus cache lama
self.addEventListener('activate', (event) => {
  console.log('[SW] Mengaktifkan service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('[SW] Menghapus cache lama:', name);
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Saat fetch — ambil dari cache dulu, baru dari jaringan
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Lewati permintaan non-GET (seperti POST)
  if (request.method !== 'GET') return;

  // Strategi khusus untuk file data kamus
  if (request.url.includes('data-max.json')) {
    event.respondWith(networkThenCache(request));
  } else {
    event.respondWith(cacheThenNetwork(request));
  }
});

// --- Strategi cache-first (utama untuk file statis)
async function cacheThenNetwork(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    // Update cache di belakang layar
    fetch(request).then((networkResponse) => {
      if (networkResponse.ok) cache.put(request, networkResponse.clone());
    });
    return cachedResponse;
  }

  // Kalau belum ada di cache, ambil dari jaringan
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch {
    // Kalau offline dan file gak ada, tampilkan fallback HTML sederhana
    if (request.destination === 'document') {
      return new Response(
        `<h2 style="text-align:center;">🌐 Offline</h2>
         <p style="text-align:center;">Silakan nyalakan internet untuk memuat ulang Kamus Dayak.</p>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }
  }
}

// --- Strategi network-first (utama untuk data JSON)
async function networkThenCache(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch {
    const cachedResponse = await cache.match(request);
    return cachedResponse || new Response('{}', { headers: { 'Content-Type': 'application/json' } });
  }
}
