import { supabaseNotificationService } from './supabaseNotificationService.js';

export class ServiceInitializer {
  private static instance: ServiceInitializer;
  private isInitialized = false;

  constructor() {
    if (ServiceInitializer.instance) {
      return ServiceInitializer.instance;
    }
    ServiceInitializer.instance = this;
  }

  public static getInstance(): ServiceInitializer {
    if (!ServiceInitializer.instance) {
      ServiceInitializer.instance = new ServiceInitializer();
    }
    return ServiceInitializer.instance;
  }

  /**
   * Initialize all services
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('[ServiceInitializer] Already initialized');
      return;
    }

    console.log('[ServiceInitializer] Starting service initialization...');

    try {
      // Initialize notification service
      await supabaseNotificationService.initialize();
      console.log('[ServiceInitializer] Notification service initialized');

      this.isInitialized = true;
      console.log('[ServiceInitializer] All services initialized successfully');
    } catch (error) {
      console.error('[ServiceInitializer] Error initializing services:', error);
      throw error;
    }
  }

  /**
   * Shutdown all services
   */
  public async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      console.log('[ServiceInitializer] Services not initialized, nothing to shutdown');
      return;
    }

    console.log('[ServiceInitializer] Shutting down services...');

    try {
      // No explicit shutdown needed for notification service currently
      // as it uses cron jobs that will be stopped when the process exits
      
      this.isInitialized = false;
      console.log('[ServiceInitializer] All services shut down successfully');
    } catch (error) {
      console.error('[ServiceInitializer] Error shutting down services:', error);
    }
  }
}

// Create and export singleton instance
export const serviceInitializer = ServiceInitializer.getInstance(); 