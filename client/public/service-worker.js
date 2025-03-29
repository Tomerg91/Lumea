// Service Worker for Lumea Coaching App
const CACHE_NAME = 'lumea-cache-v1';
const DYNAMIC_CACHE_NAME = 'lumea-dynamic-cache-v1';

// Assets to pre-cache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/assets/index.css',
  '/assets/index.js',
];

// Install event - precache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME;
          })
          .map((cacheName) => {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    })
    .then(() => self.clients.claim())
  );
});

// Helper function to handle API requests
const handleApiRequest = (event) => {
  // Network first, then cache fallback for API requests
  return fetch(event.request)
    .then((response) => {
      // Don't cache failed responses
      if (!response || response.status !== 200) {
        return response;
      }
      
      // Clone response and store in cache
      const responseToCache = response.clone();
      caches.open(DYNAMIC_CACHE_NAME)
        .then((cache) => {
          cache.put(event.request, responseToCache);
        });
        
      return response;
    })
    .catch(async () => {
      // If network request fails, try to get from cache
      const cachedResponse = await caches.match(event.request);
      if (cachedResponse) {
        console.log('Serving API request from cache:', event.request.url);
        return cachedResponse;
      }
      
      // Return basic offline JSON if nothing in cache
      return new Response(
        JSON.stringify({ 
          error: 'You are offline and this data is not available locally.' 
        }),
        { 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    });
};

// Helper function to handle asset requests
const handleAssetRequest = (event) => {
  // Cache first, then network fallback for assets
  return caches.match(event.request)
    .then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached version if available
        return cachedResponse;
      }
      
      // If not in cache, fetch from network
      return fetch(event.request)
        .then((response) => {
          // Don't cache failed or opaque responses
          if (!response || response.status !== 200 || response.type === 'opaque') {
            return response;
          }
          
          // Clone response and store in cache
          const responseToCache = response.clone();
          caches.open(DYNAMIC_CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });
            
          return response;
        });
    });
};

// Fetch event
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip cross-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }
  
  // Skip browser extension requests
  if (event.request.url.includes('chrome-extension')) {
    return;
  }
  
  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(event));
    return;
  }
  
  // Handle asset requests
  event.respondWith(handleAssetRequest(event));
});

// Handle push notifications
self.addEventListener('push', (event) => {
  if (!event.data) {
    console.log('Push event has no data');
    return;
  }
  
  try {
    const data = event.data.json();
    const options = {
      body: data.body || 'New notification',
      icon: '/assets/icon.png',
      badge: '/assets/badge.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/'
      }
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'Lumea Notification', options)
    );
  } catch (error) {
    console.error('Error handling push notification:', error);
  }
});

// Click event on notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.notification.data && event.notification.data.url) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});

// Background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-reflections') {
    event.waitUntil(syncReflections());
  } else if (event.tag === 'sync-sessions') {
    event.waitUntil(syncSessions());
  }
});

// Sync functions for offline capabilities
async function syncReflections() {
  try {
    const offlineReflections = await getOfflineData('offlineReflections');
    if (!offlineReflections || !offlineReflections.length) return;
    
    console.log(`Found ${offlineReflections.length} reflections to sync`);
    
    for (const reflection of offlineReflections) {
      try {
        // Attempt to send the reflection to the server
        const response = await fetch('/api/reflections', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(reflection),
        });
        
        if (response.ok) {
          // If successful, remove from offline storage
          await removeFromOfflineData('offlineReflections', reflection.tempId);
          console.log(`Successfully synced reflection: ${reflection.tempId}`);
        } else {
          console.error(`Failed to sync reflection: ${reflection.tempId}`, await response.text());
        }
      } catch (error) {
        console.error(`Error syncing reflection ${reflection.tempId}:`, error);
        // Keep in offline storage to retry later
      }
    }
  } catch (error) {
    console.error('Error during reflection sync process:', error);
  }
}

async function syncSessions() {
  try {
    const offlineSessions = await getOfflineData('offlineSessions');
    if (!offlineSessions || !offlineSessions.length) return;
    
    console.log(`Found ${offlineSessions.length} sessions to sync`);
    
    for (const session of offlineSessions) {
      try {
        // Determine if this is a new session or an update
        const isUpdate = session.id && !session.tempId;
        const endpoint = isUpdate 
          ? `/api/sessions/${session.id}` 
          : '/api/sessions';
        const method = isUpdate ? 'PATCH' : 'POST';
        
        // Remove temporary ID before sending to server
        const sessionData = { ...session };
        if (sessionData.tempId) {
          delete sessionData.tempId;
        }
        
        // Attempt to send the session to the server
        const response = await fetch(endpoint, {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(sessionData),
        });
        
        if (response.ok) {
          // If successful, remove from offline storage
          const idToRemove = session.tempId || session.id;
          await removeFromOfflineData('offlineSessions', idToRemove);
          console.log(`Successfully synced session: ${idToRemove}`);
        } else {
          console.error(`Failed to sync session: ${session.tempId || session.id}`, await response.text());
        }
      } catch (error) {
        console.error(`Error syncing session ${session.tempId || session.id}:`, error);
        // Keep in offline storage to retry later
      }
    }
  } catch (error) {
    console.error('Error during session sync process:', error);
  }
}

// IndexedDB utility functions for offline data storage
async function getOfflineData(storeName) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('LumeaOfflineDB', 1);
    
    request.onerror = (event) => {
      reject(`IndexedDB error: ${event.target.errorCode}`);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains('offlineReflections')) {
        db.createObjectStore('offlineReflections', { keyPath: 'tempId' });
      }
      if (!db.objectStoreNames.contains('offlineSessions')) {
        db.createObjectStore('offlineSessions', { keyPath: 'tempId' });
      }
    };
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const getAll = store.getAll();
      
      getAll.onsuccess = () => {
        resolve(getAll.result);
      };
      
      getAll.onerror = (event) => {
        reject(`Error getting data from ${storeName}: ${event.target.errorCode}`);
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    };
  });
}

async function removeFromOfflineData(storeName, itemId) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('LumeaOfflineDB', 1);
    
    request.onerror = (event) => {
      reject(`IndexedDB error: ${event.target.errorCode}`);
    };
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const deleteRequest = store.delete(itemId);
      
      deleteRequest.onsuccess = () => {
        resolve(true);
      };
      
      deleteRequest.onerror = (event) => {
        reject(`Error removing item ${itemId} from ${storeName}: ${event.target.errorCode}`);
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    };
  });
}