const CACHE_NAME = 'agenday-v1.2';
const STATIC_CACHE = 'agenday-static-v1.2';
const API_CACHE = 'agenday-api-v1.2';
const IMAGE_CACHE = 'agenday-images-v1.2';

// Essential assets for offline functionality
const urlsToCache = [
  '/',
  '/company/dashboard',
  '/company/appointments',
  '/company/clients',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// API routes to cache for offline access
const API_ROUTES = [
  '/api/company/appointments',
  '/api/company/clients',
  '/api/company/professionals',
  '/api/company/services',
  '/api/company/auth/profile'
];

// Install Service Worker with multiple cache strategies
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then(cache => {
        console.log('[SW] Caching essential assets');
        return cache.addAll(urlsToCache);
      }),
      caches.open(API_CACHE).then(cache => {
        console.log('[SW] Initializing API cache');
        return Promise.resolve();
      })
    ]).then(() => {
      console.log('[SW] Installation complete');
      return self.skipWaiting();
    })
  );
});

// Enhanced fetch with intelligent caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Handle different types of requests with appropriate strategies
  if (url.pathname.startsWith('/api/')) {
    // API requests - Network First with cache fallback
    event.respondWith(handleApiRequest(request));
  } else if (url.pathname.match(/\.(png|jpg|jpeg|svg|ico|gif|webp)$/)) {
    // Images - Cache First
    event.respondWith(handleImageRequest(request));
  } else if (url.pathname.startsWith('/icons/') || url.pathname === '/manifest.json') {
    // PWA assets - Cache First
    event.respondWith(handleStaticAsset(request));
  } else {
    // App shell - Stale While Revalidate
    event.respondWith(handleAppShell(request));
  }
});

// Network First strategy for API requests
async function handleApiRequest(request) {
  const cache = await caches.open(API_CACHE);
  
  try {
    // Try network first
    const networkResponse = await fetch(request.clone());
    
    // Cache successful responses
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache for:', request.url);
    
    // Fallback to cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for critical API requests
    if (request.url.includes('/api/company/appointments')) {
      return new Response(JSON.stringify({
        offline: true,
        message: 'Dados offline - sincronizará quando conectar'
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    }
    
    throw error;
  }
}

// Cache First strategy for images
async function handleImageRequest(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Return placeholder for offline images
    return new Response('', { status: 404 });
  }
}

// Cache First for static PWA assets
async function handleStaticAsset(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    throw error;
  }
}

// Stale While Revalidate for app shell
async function handleAppShell(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  // Serve from cache immediately if available
  const networkFetch = fetch(request).then(response => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => {
    // Network failed, return cached version or fallback
    return cachedResponse || caches.match('/');
  });
  
  return cachedResponse || networkFetch;
}

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== STATIC_CACHE && 
              cacheName !== API_CACHE && 
              cacheName !== IMAGE_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Activation complete');
      return self.clients.claim();
    })
  );
});

// Enhanced Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync event:', event.tag);
  
  if (event.tag === 'sync-appointments') {
    event.waitUntil(syncAppointments());
  } else if (event.tag === 'sync-clients') {
    event.waitUntil(syncClients());
  } else if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

// Sync appointments when back online
async function syncAppointments() {
  console.log('[SW] Syncing appointments...');
  
  try {
    const response = await fetch('/api/company/appointments');
    if (response.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put('/api/company/appointments', response.clone());
    }
  } catch (error) {
    console.log('[SW] Appointment sync failed:', error);
  }
}

// Sync clients when back online
async function syncClients() {
  console.log('[SW] Syncing clients...');
  
  try {
    const response = await fetch('/api/company/clients');
    if (response.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put('/api/company/clients', response.clone());
    }
  } catch (error) {
    console.log('[SW] Client sync failed:', error);
  }
}

function doBackgroundSync() {
  // Handle general background sync
  return Promise.all([
    syncAppointments(),
    syncClients()
  ]).then(() => {
    console.log('[SW] Background sync completed');
  }).catch((error) => {
    console.error('[SW] Background sync failed:', error);
  });
}

// Push notifications
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Nova notificação do Agenday',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Ver detalhes',
        icon: '/icons/icon-72x72.png'
      },
      {
        action: 'close',
        title: 'Fechar',
        icon: '/icons/icon-72x72.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Agenday', options)
  );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/company/dashboard')
    );
  }
});