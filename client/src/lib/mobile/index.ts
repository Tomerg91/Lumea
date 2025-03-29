import { App } from '@capacitor/app';
import { StatusBar } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Network } from '@capacitor/network';

// Type definition for the deep link callback
type DeepLinkCallback = (url: string) => void;

/**
 * Initialize the mobile platform features
 * This function is called in main.tsx when running on a mobile device
 */
export async function initMobilePlatform() {
  try {
    console.log('Initializing mobile platform features...');

    // Hide the splash screen with a fade animation
    await SplashScreen.hide({
      fadeOutDuration: 500
    });

    // Set status bar style
    try {
      // Use string values to avoid enum issues in TypeScript
      await StatusBar.setStyle({ style: 'dark' });
      // Set the background of the status bar
      await StatusBar.setBackgroundColor({ color: '#ffffff' });
    } catch (err) {
      console.error('Status Bar API not available', err);
    }

    // Setup app state change listeners
    setupAppListeners();
    
    // Setup network status listeners
    setupNetworkListeners();

    console.log('Mobile platform features initialized successfully');
  } catch (error) {
    console.error('Error initializing mobile platform:', error);
  }
}

/**
 * Sets up Capacitor App listeners for app state changes
 */
function setupAppListeners() {
  try {
    // App state change listener (background/foreground)
    App.addListener('appStateChange', ({ isActive }) => {
      console.log('App state changed. Is active?', isActive);
      
      // You could update app state or trigger actions here
      if (isActive) {
        // App came to foreground
        // Could refresh data, check notifications, etc.
      } else {
        // App went to background
        // Could pause certain operations, save state, etc.
      }
    });
    
    // Back button handler for Android
    App.addListener('backButton', ({ canGoBack }) => {
      if (!canGoBack) {
        // Handle back button press when navigation stack is empty
        App.exitApp();
      } else {
        // Let the normal back navigation work
        window.history.back();
      }
    });
    
    console.log('App listeners registered successfully');
  } catch (err) {
    console.error('Could not setup app listeners:', err);
  }
}

/**
 * Sets up Capacitor Network listeners for network status changes
 */
function setupNetworkListeners() {
  try {
    // Network status change listener
    Network.addListener('networkStatusChange', status => {
      console.log('Network status changed', status.connected);
      
      // Show/hide offline indicator based on connection status
      const offlineIndicator = document.querySelector('.offline-indicator');
      
      if (offlineIndicator) {
        if (status.connected) {
          offlineIndicator.classList.add('hidden');
        } else {
          offlineIndicator.classList.remove('hidden');
        }
      } else if (!status.connected) {
        // Create offline indicator if it doesn't exist
        createOfflineIndicator();
      }
    });
    
    // Initial check
    checkNetworkStatus();
    
    console.log('Network listeners registered successfully');
  } catch (err) {
    console.error('Could not setup network listeners:', err);
  }
}

/**
 * Check current network status
 */
async function checkNetworkStatus() {
  try {
    const status = await Network.getStatus();
    console.log('Current network status:', status.connected ? 'online' : 'offline');
    
    if (!status.connected) {
      createOfflineIndicator();
    }
  } catch (err) {
    console.error('Could not check network status:', err);
  }
}

/**
 * Create offline indicator element
 */
function createOfflineIndicator() {
  const indicator = document.createElement('div');
  indicator.className = 'offline-indicator';
  indicator.textContent = 'You are offline. Some features may be unavailable.';
  document.body.appendChild(indicator);
}

/**
 * Setup deep link handling for mobile apps
 * @param callback Function to call when a deep link is received
 */
export function setupDeepLinks(callback: DeepLinkCallback) {
  try {
    // Add app URL open listener
    App.addListener('appUrlOpen', (data) => {
      // Example: App opened with URL: https://lumea.app/client/dashboard
      console.log('App opened with URL:', data.url);
      callback(data.url);
    });
    
    // Get initial URL if app was opened by a deep link
    App.getLaunchUrl().then(result => {
      if (result && result.url) {
        console.log('App launched with URL:', result.url);
        callback(result.url);
      }
    });
    
    console.log('Deep links handler registered successfully');
  } catch (err) {
    console.error('Could not setup deep links handler:', err);
  }
}