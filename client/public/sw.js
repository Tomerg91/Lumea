// Lumea Coaching Platform Service Worker
// Version 1.0.0

const CACHE_NAME = 'lumea-coaching-v1';
const OFFLINE_URL = '/offline';
const BACKGROUND_SYNC_TAG = 'lumea-background-sync';

// Cache strategies for different resource types
const CACHE_STRATEGIES = {
  // Static assets - cache first
  static: [
    '/',
    '/offline',
    '/manifest.json',
    '/favicon.ico'
  ],
  
  // API routes - network first with cache fallback
  api: [
    '/api/auth/me',
    '/api/sessions',
    '/api/reflections',
    '/api/notifications'
  ],
  
  // Assets - cache first with network update
  assets: [
    '/static/',
    '/assets/',
    '/icons/',
    '/images/'
  ]
};

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching essential resources');
        return cache.addAll(CACHE_STRATEGIES.static);
      })
      .then(() => {
        console.log('[SW] Service worker installed successfully');
        // Force activation to update immediately
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      
      // Take control of all clients
      self.clients.claim()
    ])
    .then(() => {
      console.log('[SW] Service worker activated successfully');
    })
    .catch((error) => {
      console.error('[SW] Activation failed:', error);
    })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests and chrome-extension requests
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }
  
  // Handle different resource types
  if (url.pathname.startsWith('/api/')) {
    // API requests - network first with cache fallback
    event.respondWith(handleApiRequest(request));
  } else if (isStaticAsset(url.pathname)) {
    // Static assets - cache first
    event.respondWith(handleStaticAsset(request));
  } else if (url.pathname.startsWith('/')) {
    // HTML pages - network first with offline fallback
    event.respondWith(handlePageRequest(request));
  }
});

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  
  try {
    console.log('[SW] Fetching API:', request.url);
    const response = await fetch(request);
    
    if (response.ok) {
      // Cache successful responses
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('[SW] API request failed, checking cache:', request.url);
    
    // Return cached version if available
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      console.log('[SW] Serving cached API response:', request.url);
      return cachedResponse;
    }
    
    // Return offline response for critical APIs
    if (request.url.includes('/api/auth/me')) {
      return new Response(
        JSON.stringify({ offline: true, message: 'Currently offline' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    throw error;
  }
}

// Handle static assets with cache-first strategy
async function handleStaticAsset(request) {
  const cache = await caches.open(CACHE_NAME);
  
  // Check cache first
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    console.log('[SW] Serving cached asset:', request.url);
    
    // Update cache in background
    fetch(request).then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
    }).catch(() => {
      // Silently fail background update
    });
    
    return cachedResponse;
  }
  
  // Fetch from network and cache
  try {
    console.log('[SW] Fetching asset:', request.url);
    const response = await fetch(request);
    
    if (response.ok) {
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error('[SW] Failed to fetch asset:', request.url, error);
    throw error;
  }
}

// Handle page requests with network-first and offline fallback
async function handlePageRequest(request) {
  try {
    console.log('[SW] Fetching page:', request.url);
    const response = await fetch(request);
    
    if (response.ok) {
      // Cache successful page responses
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('[SW] Page request failed, checking cache:', request.url);
    
    // Check cache for the specific page
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('[SW] Serving cached page:', request.url);
      return cachedResponse;
    }
    
    // Serve offline page as fallback
    console.log('[SW] Serving offline page for:', request.url);
    const offlineResponse = await cache.match(OFFLINE_URL);
    return offlineResponse || new Response('Offline', { status: 503 });
  }
}

// Background sync for form submissions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === BACKGROUND_SYNC_TAG) {
    event.waitUntil(processBackgroundSync());
  }
});

// Process queued background sync data
async function processBackgroundSync() {
  console.log('[SW] Processing background sync...');
  
  try {
    // Get queued data from IndexedDB
    const queuedData = await getQueuedData();
    
    for (const item of queuedData) {
      try {
        console.log('[SW] Processing queued item:', item.type);
        
        // Process different types of queued data
        switch (item.type) {
          case 'reflection':
            await syncReflection(item.data);
            break;
          case 'session':
            await syncSession(item.data);
            break;
          case 'notification':
            await syncNotification(item.data);
            break;
          default:
            console.warn('[SW] Unknown sync type:', item.type);
        }
        
        // Remove from queue after successful sync
        await removeFromQueue(item.id);
        console.log('[SW] Successfully synced item:', item.id);
        
      } catch (error) {
        console.error('[SW] Failed to sync item:', item.id, error);
        // Keep in queue for retry
      }
    }
    
    console.log('[SW] Background sync completed');
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  if (!event.data) {
    console.warn('[SW] Push event has no data');
    return;
  }
  
  try {
    const data = event.data.json();
    console.log('[SW] Push data:', data);
    
    const options = {
      body: data.body || 'New notification from Lumea',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      image: data.image,
      tag: data.tag || 'lumea-notification',
      data: data.data || {},
      actions: [
        {
          action: 'view',
          title: 'View',
          icon: '/icons/action-view.png'
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
          icon: '/icons/action-dismiss.png'
        }
      ],
      vibrate: [200, 100, 200],
      requireInteraction: data.priority === 'high' || data.priority === 'urgent'
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'Lumea Coaching', options)
    );
    
  } catch (error) {
    console.error('[SW] Failed to process push notification:', error);
    
    // Show fallback notification
    event.waitUntil(
      self.registration.showNotification('Lumea Coaching', {
        body: 'You have a new notification',
        icon: '/icons/icon-192x192.png'
      })
    );
  }
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification);
  
  event.notification.close();
  
  const action = event.action;
  const data = event.notification.data;
  
  if (action === 'dismiss') {
    return;
  }
  
  // Default action or 'view' action
  let targetUrl = '/';
  
  if (data && data.url) {
    targetUrl = data.url;
  } else if (data && data.type) {
    // Route based on notification type
    switch (data.type) {
      case 'session_reminder':
      case 'session_confirmation':
        targetUrl = `/coach/sessions/${data.sessionId || ''}`;
        break;
      case 'reflection':
        targetUrl = `/client/reflections/${data.reflectionId || ''}`;
        break;
      case 'notification':
        targetUrl = '/notifications';
        break;
    }
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Try to focus existing window
        for (const client of clientList) {
          if (client.url.includes(targetUrl) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

// Utility functions
function isStaticAsset(pathname) {
  return CACHE_STRATEGIES.assets.some(pattern => 
    pathname.startsWith(pattern.replace('/', ''))
  ) || pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf)$/);
}

// IndexedDB helpers for background sync (simplified implementation)
async function getQueuedData() {
  // In a real implementation, this would use IndexedDB
  // For now, return empty array
  return [];
}

async function removeFromQueue(id) {
  // In a real implementation, this would remove from IndexedDB
  console.log('[SW] Would remove from queue:', id);
}

async function syncReflection(data) {
  // Sync reflection data
  const response = await fetch('/api/reflections', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    throw new Error(`Sync failed: ${response.statusText}`);
  }
  
  return response.json();
}

async function syncSession(data) {
  // Sync session data
  const response = await fetch('/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    throw new Error(`Sync failed: ${response.statusText}`);
  }
  
  return response.json();
}

async function syncNotification(data) {
  // Sync notification data
  const response = await fetch('/api/notifications/read', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    throw new Error(`Sync failed: ${response.statusText}`);
  }
  
  return response.json();
}

console.log('[SW] Service worker loaded successfully'); 