/**
 * Service Worker für Production Performance-Optimierung
 * Enterprise-Grade Caching und Offline-Funktionalität
 */

const CACHE_NAME = 'wirsing-ai-v1.0.0';
const STATIC_CACHE_NAME = 'wirsing-static-v1.0.0';
const DYNAMIC_CACHE_NAME = 'wirsing-dynamic-v1.0.0';

// Critical Resources für sofortigen Cache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/favicon.svg'
];

// Performance Budget Konfiguration
const PERFORMANCE_BUDGETS = {
  bundleSize: 500 * 1024, // 500KB
  imageSize: 200 * 1024,  // 200KB
  totalRequests: 50,
  cacheTtl: 24 * 60 * 60 * 1000 // 24 Stunden
};

// Cache-Strategien
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  NETWORK_ONLY: 'network-only',
  CACHE_ONLY: 'cache-only'
};

/**
 * Service Worker Installation
 */
self.addEventListener('install', event => {
  console.log('🚀 Service Worker wird installiert...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then(cache => {
        console.log('📦 Statische Assets werden gecacht...');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('✅ Service Worker Installation abgeschlossen');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('❌ Service Worker Installation fehlgeschlagen:', error);
      })
  );
});

/**
 * Service Worker Aktivierung
 */
self.addEventListener('activate', event => {
  console.log('⚡ Service Worker wird aktiviert...');
  
  event.waitUntil(
    Promise.all([
      // Alte Caches löschen
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (!cacheName.includes('wirsing-ai-v1.0.0')) {
              console.log('🗑️ Lösche alten Cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Claims alle Clients
      self.clients.claim()
    ]).then(() => {
      console.log('✅ Service Worker aktiviert');
    })
  );
});

/**
 * Fetch Event Handler - Caching-Strategien
 */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Nur HTTP/HTTPS Requests behandeln
  if (!request.url.startsWith('http')) {
    return;
  }
  
  // Performance Budget Check
  if (shouldSkipCaching(request)) {
    return;
  }
  
  event.respondWith(handleFetchRequest(request));
});

/**
 * Haupt-Fetch-Handler mit verschiedenen Strategien
 */
async function handleFetchRequest(request) {
  const url = new URL(request.url);
  
  try {
    // API Requests - Network First
    if (url.pathname.startsWith('/api/')) {
      return await networkFirstStrategy(request, DYNAMIC_CACHE_NAME);
    }
    
    // Static Assets - Cache First
    if (isStaticAsset(url.pathname)) {
      return await cacheFirstStrategy(request, STATIC_CACHE_NAME);
    }
    
    // Images - Cache First mit Fallback
    if (isImage(url.pathname)) {
      return await cacheFirstWithNetworkFallback(request, DYNAMIC_CACHE_NAME);
    }
    
    // Navigation Requests - Stale While Revalidate
    if (request.mode === 'navigate') {
      return await staleWhileRevalidateStrategy(request, STATIC_CACHE_NAME);
    }
    
    // Default: Network First
    return await networkFirstStrategy(request, DYNAMIC_CACHE_NAME);
    
  } catch (error) {
    console.error('❌ Fetch Handler Fehler:', error);
    
    // Fallback für Navigation Requests
    if (request.mode === 'navigate') {
      const cache = await caches.open(STATIC_CACHE_NAME);
      const cachedResponse = await cache.match('/index.html');
      if (cachedResponse) {
        return cachedResponse;
      }
    }
    
    // Offline Fallback
    return new Response(
      JSON.stringify({ 
        error: 'Offline', 
        message: 'Service ist momentan nicht verfügbar' 
      }),
      { 
        status: 503, 
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Cache First Strategie
 */
async function cacheFirstStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // Performance Monitoring
    updateCacheMetrics('cache_hit', request.url);
    return cachedResponse;
  }
  
  // Nicht im Cache - fetch from network
  const networkResponse = await fetch(request);
  
  if (networkResponse.ok) {
    // Nur HTML, CSS, JS und Images cachen
    if (shouldCacheResponse(request, networkResponse)) {
      await cache.put(request, networkResponse.clone());
      updateCacheMetrics('cache_miss', request.url);
    }
  }
  
  return networkResponse;
}

/**
 * Network First Strategie
 */
async function networkFirstStrategy(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      
      // Nur successful responses cachen
      if (shouldCacheResponse(request, networkResponse)) {
        await cache.put(request, networkResponse.clone());
      }
    }
    
    return networkResponse;
    
  } catch (error) {
    // Network fehlgeschlagen - fallback to cache
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      updateCacheMetrics('network_fallback', request.url);
      return cachedResponse;
    }
    
    throw error;
  }
}

/**
 * Stale While Revalidate Strategie
 */
async function staleWhileRevalidateStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  // Sofortige Response aus Cache (falls vorhanden)
  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse.ok && shouldCacheResponse(request, networkResponse)) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(error => {
    console.warn('⚠️ Network request failed:', error);
    return null;
  });
  
  // Return cached response immediately, update in background
  if (cachedResponse) {
    updateCacheMetrics('stale_while_revalidate', request.url);
    return cachedResponse;
  }
  
  // Kein Cache vorhanden - warte auf Network
  const networkResponse = await fetchPromise;
  if (networkResponse) {
    return networkResponse;
  }
  
  // Auch Network fehlgeschlagen
  throw new Error('Both cache and network failed');
}

/**
 * Cache First mit Network Fallback
 */
async function cacheFirstWithNetworkFallback(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    updateCacheMetrics('image_cache_hit', request.url);
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
      updateCacheMetrics('image_cache_miss', request.url);
    }
    
    return networkResponse;
    
  } catch (error) {
    // Fallback zu einem generischen Bild
    return new Response(
      generatePlaceholderImage(),
      { 
        headers: { 
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'no-cache'
        }
      }
    );
  }
}

/**
 * Hilfsfunktionen
 */
function isStaticAsset(pathname) {
  return /\.(js|css|woff|woff2|ttf|eot)$/i.test(pathname);
}

function isImage(pathname) {
  return /\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(pathname);
}

function shouldCacheResponse(request, response) {
  const contentType = response.headers.get('content-type') || '';
  const cacheableTypes = [
    'text/html',
    'text/css',
    'application/javascript',
    'application/json',
    'image/'
  ];
  
  return cacheableTypes.some(type => contentType.includes(type));
}

function shouldSkipCaching(request) {
  const url = new URL(request.url);
  
  // Skip für WebSocket, Eventsource, etc.
  if (request.headers.get('upgrade') === 'websocket') {
    return true;
  }
  
  // Skip für sehr große Dateien (über Performance Budget)
  const contentLength = parseInt(request.headers.get('content-length') || '0');
  if (contentLength > PERFORMANCE_BUDGETS.bundleSize) {
    return true;
  }
  
  return false;
}

/**
 * Performance Monitoring
 */
function updateCacheMetrics(type, url) {
  // Sende Metrics an Analytics (in Production würde hier der tatsächliche Call stehen)
  if (typeof self.clients !== 'undefined') {
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'CACHE_METRICS',
          data: {
            strategy: type,
            url: url,
            timestamp: Date.now()
          }
        });
      });
    });
  }
}

/**
 * Placeholder Image Generator
 */
function generatePlaceholderImage() {
  return `
    <svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f0f0f0"/>
      <text x="50%" y="50%" font-family="Arial" font-size="14" 
            text-anchor="middle" fill="#666">
        Bild nicht verfügbar
      </text>
    </svg>
  `;
}

/**
 * Background Sync für Offline Actions
 */
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    console.log('🔄 Background Sync wird ausgeführt...');
    event.waitUntil(performBackgroundSync());
  }
});

async function performBackgroundSync() {
  // Hier würden offline gespeicherte Actions synchronisiert werden
  console.log('✅ Background Sync abgeschlossen');
}

/**
 * Push Notifications (für zukünftige Features)
 */
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'Neue Benachrichtigung',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Öffnen',
        icon: '/favicon.svg'
      },
      {
        action: 'close',
        title: 'Schließen',
        icon: '/favicon.svg'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Wirsing AI', options)
  );
});

/**
 * Notification Click Handler
 */
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

/**
 * Message Handler für Communication mit Main Thread
 */
self.addEventListener('message', event => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_CACHE_STATUS':
      getCacheStatus().then(status => {
        event.ports[0].postMessage(status);
      });
      break;
      
    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;
      
    default:
      console.log('Unbekannter Message Type:', type);
  }
});

/**
 * Cache Status abrufen
 */
async function getCacheStatus() {
  const cacheNames = await caches.keys();
  const status = {};
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    status[cacheName] = keys.length;
  }
  
  return status;
}

/**
 * Alle Caches leeren
 */
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  return Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
}

console.log('🚀 Service Worker geladen und bereit');