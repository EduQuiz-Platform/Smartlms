const CACHE_NAME = 'smartlms-v1';
const ASSETS = [
  './',
  './index.html',
  './admin.html',
  './teacher.html',
  './student.html',
  './assets/css/main.css',
  './assets/js/core.js',
  './assets/js/admin.js',
  './assets/js/teacher.js',
  './assets/js/student.js',
  './assets/js/auth.js',
  './supabase-config.js',
  './manifest.json',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching shell assets');
      return cache.addAll(ASSETS);
    })
  );
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests for Supabase API (handled by client)
  if (event.request.url.includes('supabase.co')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cacheRes) => {
      return cacheRes || fetch(event.request).then((fetchRes) => {
        return caches.open(CACHE_NAME).then((cache) => {
          // Cache new static resources on the fly
          if (event.request.url.startsWith(self.location.origin)) {
            cache.put(event.request.url, fetchRes.clone());
          }
          return fetchRes;
        });
      });
    }).catch(() => {
      if (event.request.url.indexOf('.html') > -1) {
        return caches.match('/index.html');
      }
    })
  );
});

// Background Sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-db-ops') {
    event.waitUntil(syncDatabaseOperations());
  }
});

async function syncDatabaseOperations() {
  console.log('Background sync in progress...');
  // In a real app, you would read queued operations from IndexedDB
  // and send them to the Supabase API.
}

// Push Notifications
self.addEventListener('push', (event) => {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/assets/icons/icon-192x192.png',
    badge: '/assets/icons/icon-192x192.png'
  };
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});
