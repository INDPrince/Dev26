/* eslint-disable no-restricted-globals */
// Service Worker for PWA with auto-update and hostname check

const CACHE_NAME = 'quiz-app-v1.0.3';
const ADMIN_CACHE_NAME = 'quiz-admin-v1.0.3';

// Check if running on emergent.sh - if yes, don't cache
const isEmergentHostname = () => {
  const hostname = self.location.hostname;
  return hostname === 'emergent.sh' || hostname.endsWith('.emergent.sh') || hostname.endsWith('.emergentagent.com');
};

// Determine if this is admin panel
const isAdminPanel = () => {
  return self.location.pathname.startsWith('/admin');
};

// IMPORTANT: Dynamic cache list - cache whatever is actually loaded
const ESSENTIAL_URLS = [
  '/',
  '/index.html'
];

// Install event - cache files with proper progress tracking
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  
  // Skip if on emergent hostname
  if (isEmergentHostname()) {
    console.log('[Service Worker] Skipping cache on emergent hostname');
    self.skipWaiting();
    return;
  }
  
  event.waitUntil(
    (async () => {
      try {
        const cacheName = isAdminPanel() ? ADMIN_CACHE_NAME : CACHE_NAME;
        const cache = await caches.open(cacheName);
        console.log('[Service Worker] Opened cache:', cacheName);
        
        // Notify that caching started
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
          client.postMessage({ type: 'CACHE_STARTED' });
        });
        
        // Cache essential files with progress
        const totalFiles = ESSENTIAL_URLS.length;
        let cachedFiles = 0;
        
        for (const url of ESSENTIAL_URLS) {
          try {
            await cache.add(url);
            cachedFiles++;
            const progress = Math.round((cachedFiles / totalFiles) * 50); // 0-50% for essential
            
            console.log(`[Service Worker] Cached: ${url} (${progress}%)`);
            
            const updatedClients = await self.clients.matchAll();
            updatedClients.forEach(client => {
              client.postMessage({
                type: 'CACHE_PROGRESS',
                progress: progress,
                file: url
              });
            });
          } catch (err) {
            console.error('[Service Worker] Failed to cache:', url, err);
          }
        }
        
        // Simulate additional caching for assets (will be cached on fetch)
        // This gives smoother progress experience
        for (let i = 50; i <= 100; i += 10) {
          await new Promise(resolve => setTimeout(resolve, 100));
          const updatedClients = await self.clients.matchAll();
          updatedClients.forEach(client => {
            client.postMessage({
              type: 'CACHE_PROGRESS',
              progress: i
            });
          });
        }
        
        console.log('[Service Worker] Initial caching complete');
        
        // Notify completion
        const finalClients = await self.clients.matchAll();
        finalClients.forEach(client => {
          client.postMessage({ type: 'CACHE_COMPLETE' });
        });
        
        return self.skipWaiting();
      } catch (error) {
        console.error('[Service Worker] Install error:', error);
        throw error;
      }
    })()
  );
});

// Activate event - clean up old caches and take control
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== ADMIN_CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
      
      console.log('[Service Worker] Taking control');
      await self.clients.claim();
      
      // Notify all clients that SW is active
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({ type: 'SW_ACTIVATED' });
      });
    })()
  );
});

// Fetch event - cache-first strategy with network fallback
self.addEventListener('fetch', (event) => {
  // Skip caching on emergent hostname
  if (isEmergentHostname()) {
    return;
  }
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  const requestUrl = new URL(event.request.url);
  
  // Skip API calls - always fetch from network
  if (requestUrl.pathname.includes('/api/')) {
    return;
  }
  
  // Skip admin and push routes - never cache
  if (requestUrl.pathname.includes('/admin') || 
      requestUrl.pathname.includes('/push') || 
      requestUrl.pathname.includes('/gitpush')) {
    return;
  }
  
  // Skip chrome-extension and other protocols
  if (!requestUrl.protocol.startsWith('http')) {
    return;
  }
  
  event.respondWith(
    (async () => {
      try {
        // Try cache first
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          console.log('[Service Worker] Serving from cache:', event.request.url);
          return cachedResponse;
        }
        
        // Not in cache, fetch from network
        console.log('[Service Worker] Fetching from network:', event.request.url);
        const networkResponse = await fetch(event.request);
        
        // Check if response is valid and cacheable
        if (networkResponse && 
            networkResponse.status === 200 && 
            (networkResponse.type === 'basic' || networkResponse.type === 'cors')) {
          
          // Clone BEFORE reading the body
          const responseToCache = networkResponse.clone();
          
          // Cache in background (don't await)
          const cacheName = isAdminPanel() ? ADMIN_CACHE_NAME : CACHE_NAME;
          caches.open(cacheName).then(cache => {
            cache.put(event.request, responseToCache).catch(err => {
              console.log('[SW] Cache put failed (non-critical):', err.message);
            });
          }).catch(err => {
            console.log('[SW] Cache open failed (non-critical):', err.message);
          });
        }
        
        return networkResponse;
      } catch (error) {
        console.log('[Service Worker] Fetch failed, trying cache:', error);
        
        // Network failed, try to return cached version
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Try to return index.html for navigation requests
        if (event.request.mode === 'navigate') {
          const indexCache = await caches.match('/index.html');
          if (indexCache) {
            return indexCache;
          }
        }
        
        throw error;
      }
    })()
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
