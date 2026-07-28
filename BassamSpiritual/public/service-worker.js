const CACHE_NAME = 'noor-rabbani-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/admin.html',
  '/dashboard.html',
  '/login.html',
  '/register.html',
  '/about-sheikh.html',
  '/style.css',
  '/api.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;800&family=Amiri:ital,wght@0,400;0,700;1,400&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
