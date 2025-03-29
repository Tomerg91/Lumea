/**
 * Service worker registration and management
 */

// Check if service workers are supported
export const isServiceWorkerSupported = 'serviceWorker' in navigator;

/**
 * Register the service worker
 * @returns Promise resolving to service worker registration or undefined if not supported
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | undefined> {
  // Temporarily disabled for debugging
  console.log('Service worker registration temporarily disabled for debugging');
  return undefined;
  
  /* Original implementation:
  if (!isServiceWorkerSupported) {
    console.warn('Service workers are not supported in this browser');
    return undefined;
  }

  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/',
    });
    console.log('Service worker registered successfully:', registration.scope);
    return registration;
  } catch (error) {
    console.error('Service worker registration failed:', error);
    return undefined;
  }
  */
}

/**
 * Unregister the service worker
 * @returns Promise resolving to boolean indicating success
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!isServiceWorkerSupported) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      const success = await registration.unregister();
      console.log('Service worker unregistered:', success);
      return success;
    }
    return false;
  } catch (error) {
    console.error('Service worker unregistration failed:', error);
    return false;
  }
}

/**
 * Check for service worker updates
 * @returns Promise resolving to boolean indicating if an update was found
 */
export async function checkForServiceWorkerUpdates(): Promise<boolean> {
  if (!isServiceWorkerSupported) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.update();
      return !!registration.waiting;
    }
    return false;
  } catch (error) {
    console.error('Service worker update check failed:', error);
    return false;
  }
}

/**
 * Force update of the service worker
 * @returns Promise resolving to void
 */
export async function forceServiceWorkerUpdate(): Promise<void> {
  if (!isServiceWorkerSupported) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration && registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  } catch (error) {
    console.error('Service worker force update failed:', error);
  }
}

/**
 * Register for push notifications
 * @returns Promise resolving to PushSubscription
 */
export async function registerForPush(): Promise<PushSubscription | null> {
  if (!isServiceWorkerSupported || !('PushManager' in window)) {
    console.warn('Push notifications are not supported in this browser');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      console.warn('No service worker registration found');
      return null;
    }

    // Request permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Push notification permission denied');
      return null;
    }

    // Subscribe to push notifications
    try {
      const subscribeOptions = {
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          'BLgFUe4GIJdw2CXojZCkxXHOHnkP2nWQ2aULJf8VUQ1nC_jEYGVp7AP7rYprxHjLwWwe7N6iegOjLznIr2RR7Go' // Replace with actual VAPID public key
        ),
      };

      const subscription = await registration.pushManager.subscribe(subscribeOptions);
      console.log('Push notification subscription successful:', subscription);
      return subscription;
    } catch (error) {
      console.error('Push notification subscription failed:', error);
      return null;
    }
  } catch (error) {
    console.error('Service worker registration for push failed:', error);
    return null;
  }
}

/**
 * Helper function to convert VAPID key from base64 to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}