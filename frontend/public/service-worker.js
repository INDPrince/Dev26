/* eslint-disable no-restricted-globals */
// Service Worker for PWA with auto-update and hostname check

const CACHE_NAME = 'quiz-app-v1.0.1';
const ADMIN_CACHE_NAME = 'quiz-admin-v1.0.1';

// Check if running on emergent.sh - if yes, don't cache (FIXED: exact domain only)
const isEmergentHostname = () => {
  const hostname = self.location.hostname;
  return hostname === 'emergent.sh' || hostname.endsWith('.emergent.sh');
};

// Determine if this is admin panel
const isAdminPanel = () => {
  return self.location.pathname.startsWith('/admin');
};

// Files to cache for main app (NO admin files)
const MAIN_APP_URLS = [
  '/',
  '/index.html',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

// Files to cache for admin panel (ONLY admin files)
const ADMIN_APP_URLS = [
  '/admin',
  '/admin/dashboard',
  '/admin/login',
  '/index.html',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest-admin.json'
];

// Install event - cache files based on app type
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  
  // Skip if on emergent hostname
  if (isEmergentHostname()) {
    console.log('[Service Worker] Skipping cache on emergent hostname');
    self.skipWaiting();
    return;
  }
  
  event.waitUntil(
    caches.open(isAdminPanel() ? ADMIN_CACHE_NAME : CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching app shell');
      const urlsToCache = isAdminPanel() ? ADMIN_APP_URLS : MAIN_APP_URLS;
      return cache.addAll(urlsToCache).catch(err => {
        console.error('[Service Worker] Cache addAll failed:', err);
      });
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches and take control
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== ADMIN_CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] Taking control');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip caching on emergent hostname
  if (isEmergentHostname()) {
    return;
  }
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Skip API calls - always fetch from network (FIXED: prevents Response clone error)
  if (event.request.url.includes('/api/')) {
    return;
  }
  
  // Skip admin and push routes - never cache
  if (event.request.url.includes('/admin') || event.request.url.includes('/push') || event.request.url.includes('/gitpush')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Cache hit - return response
      if (response) {
        return response;
      }
      
      // Clone the request BEFORE using it
      const fetchRequest = event.request.clone();
      
      return fetch(fetchRequest).then((response) => {
        // Check if valid response and can be cached
        // FIXED: Check if response is already used or not OK before cloning
        if (!response || response.status !== 200 || (response.type !== 'basic' && response.type !== 'cors')) {
          return response;
        }
        
        // FIXED: Only clone if response body hasn't been used
        // Check if response is cloneable
        try {
          const responseToCache = response.clone();
          const cacheName = isAdminPanel() ? ADMIN_CACHE_NAME : CACHE_NAME;
          
          // Don't await - cache in background
          caches.open(cacheName).then((cache) => {
            cache.put(event.request, responseToCache).catch(err => {
              console.log('[SW] Cache put failed:', err);
            });
          });
        } catch (e) {
          console.log('[SW] Response clone failed:', e);
        }
        
        return response;
      }).catch((err) => {
        console.log('[SW] Fetch failed:', err);
        // Network failed, try to return cached offline page
        return caches.match('/index.html');
      });
    })
  );
});

// Listen for update messages
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[Service Worker] Received SKIP_WAITING message');
    self.skipWaiting();
  }
});

// Notify clients about updates
self.addEventListener('controllerchange', () => {
  console.log('[Service Worker] Controller changed');
});
