const CACHE_NAME = 'aikya-v2';
const ASSETS = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './manifest.json',
    './test.png'
];

self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker activated');
});

// Handle push events
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : { title: 'New Message', body: 'You have a new message!' };

    const options = {
        body: data.body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-72.png',
        data: {
            url: self.registration.scope
        }
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data?.url || '/')
    );
});

// Mandatory fetch handler for PWA installability
self.addEventListener('fetch', (event) => {
    // This can be empty, but it must exist for the "Install" prompt to show
    event.respondWith(fetch(event.request));
});

