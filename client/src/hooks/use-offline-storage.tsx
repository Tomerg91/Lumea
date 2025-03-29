import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

/**
 * Hook for working with offline data storage using IndexedDB
 * @param storeName The name of the IndexedDB store to use
 */
export function useOfflineStorage<T>(storeName: string) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    // Initialize the database
    const request = indexedDB.open('LumeaOfflineDB', 1);
    
    request.onerror = (event) => {
      const target = event.target as IDBRequest;
      setError(new Error(`IndexedDB error: ${target.error?.message}`));
    };
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains('offlineReflections')) {
        db.createObjectStore('offlineReflections', { keyPath: 'tempId' });
      }
      if (!db.objectStoreNames.contains('offlineSessions')) {
        db.createObjectStore('offlineSessions', { keyPath: 'tempId' });
      }
      if (!db.objectStoreNames.contains('offlineResources')) {
        db.createObjectStore('offlineResources', { keyPath: 'tempId' });
      }
      if (!db.objectStoreNames.contains('offlinePayments')) {
        db.createObjectStore('offlinePayments', { keyPath: 'tempId' });
      }
    };
    
    request.onsuccess = () => {
      setIsInitialized(true);
    };
    
    return () => {
      // Cleanup if needed
    };
  }, []);

  /**
   * Save an item to the offline storage
   * @param item The item to save
   * @returns Promise resolving to the item with a tempId added
   */
  const saveItem = async (item: T): Promise<T & { tempId: string }> => {
    if (!isInitialized) {
      throw new Error('Offline storage not initialized yet');
    }
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('LumeaOfflineDB', 1);
      
      request.onerror = (event) => {
        const target = event.target as IDBRequest;
        reject(new Error(`IndexedDB error: ${target.error?.message}`));
      };
      
      request.onsuccess = (event) => {
        try {
          const db = (event.target as IDBOpenDBRequest).result;
          const transaction = db.transaction(storeName, 'readwrite');
          const store = transaction.objectStore(storeName);
          
          // Add a temporary ID if it doesn't have one
          const itemWithTempId = {
            ...item,
            tempId: (item as any).tempId || uuidv4()
          };
          
          const addRequest = store.put(itemWithTempId);
          
          addRequest.onsuccess = () => {
            resolve(itemWithTempId as T & { tempId: string });
          };
          
          addRequest.onerror = (event) => {
            const target = event.target as IDBRequest;
            reject(new Error(`Error saving item: ${target.error?.message}`));
          };
          
          transaction.oncomplete = () => {
            db.close();
          };
        } catch (err) {
          reject(err);
        }
      };
    });
  };

  /**
   * Get all items from the offline storage
   * @returns Promise resolving to an array of items
   */
  const getItems = async (): Promise<(T & { tempId: string })[]> => {
    if (!isInitialized) {
      throw new Error('Offline storage not initialized yet');
    }
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('LumeaOfflineDB', 1);
      
      request.onerror = (event) => {
        const target = event.target as IDBRequest;
        reject(new Error(`IndexedDB error: ${target.error?.message}`));
      };
      
      request.onsuccess = (event) => {
        try {
          const db = (event.target as IDBOpenDBRequest).result;
          const transaction = db.transaction(storeName, 'readonly');
          const store = transaction.objectStore(storeName);
          const getAllRequest = store.getAll();
          
          getAllRequest.onsuccess = () => {
            resolve(getAllRequest.result as (T & { tempId: string })[]);
          };
          
          getAllRequest.onerror = (event) => {
            const target = event.target as IDBRequest;
            reject(new Error(`Error getting items: ${target.error?.message}`));
          };
          
          transaction.oncomplete = () => {
            db.close();
          };
        } catch (err) {
          reject(err);
        }
      };
    });
  };

  /**
   * Remove an item from the offline storage
   * @param tempId The temporary ID of the item to remove
   * @returns Promise resolving to a boolean indicating success
   */
  const removeItem = async (tempId: string): Promise<boolean> => {
    if (!isInitialized) {
      throw new Error('Offline storage not initialized yet');
    }
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('LumeaOfflineDB', 1);
      
      request.onerror = (event) => {
        const target = event.target as IDBRequest;
        reject(new Error(`IndexedDB error: ${target.error?.message}`));
      };
      
      request.onsuccess = (event) => {
        try {
          const db = (event.target as IDBOpenDBRequest).result;
          const transaction = db.transaction(storeName, 'readwrite');
          const store = transaction.objectStore(storeName);
          const deleteRequest = store.delete(tempId);
          
          deleteRequest.onsuccess = () => {
            resolve(true);
          };
          
          deleteRequest.onerror = (event) => {
            const target = event.target as IDBRequest;
            reject(new Error(`Error removing item: ${target.error?.message}`));
          };
          
          transaction.oncomplete = () => {
            db.close();
          };
        } catch (err) {
          reject(err);
        }
      };
    });
  };

  /**
   * Triggers a background sync via the service worker
   * @param syncTag The tag to identify the type of sync
   * @returns Promise resolving to a boolean indicating if sync was registered
   */
  const triggerSync = async (syncTag: string): Promise<boolean> => {
    if (!('serviceWorker' in navigator) || !('SyncManager' in window)) {
      return false;
    }
    
    try {
      const registration = await navigator.serviceWorker.ready;
      // Using the SyncManager API (defined in types/service-worker.d.ts)
      if (registration.sync) {
        await registration.sync.register(syncTag);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Background sync registration failed:', error);
      return false;
    }
  };

  return {
    saveItem,
    getItems,
    removeItem,
    triggerSync,
    isInitialized,
    error
  };
}

// Example usage:
// const { saveItem, getItems, removeItem, triggerSync } = useOfflineStorage<Reflection>('offlineReflections');
// 
// // Save a reflection when offline
// const handleSaveReflection = async (reflection: Reflection) => {
//   try {
//     await saveItem(reflection);
//     await triggerSync('sync-reflections');
//   } catch (error) {
//     // Handle error
//   }
// };