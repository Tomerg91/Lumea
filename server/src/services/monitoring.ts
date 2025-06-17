interface MonitoringConfig {
  enableAPM: boolean;
  enableErrorTracking: boolean;
  enablePerformanceTracking: boolean;
  sampleRate: number;
}

class MonitoringService {
  private static instance: MonitoringService;
  private config: MonitoringConfig;
  private isInitialized: boolean = false;
  private sentryAvailable: boolean = false;
  private newRelicAvailable: boolean = false;

  private constructor() {
    this.config = {
      enableAPM: process.env.NODE_ENV === 'production' && !!process.env.NEW_RELIC_LICENSE_KEY,
      enableErrorTracking: process.env.NODE_ENV === 'production' && !!process.env.SENTRY_DSN,
      enablePerformanceTracking: true,
      sampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    };
    
    this.initialize();
  }

  private async initialize() {
    if (this.isInitialized) return;

    try {
      // Check if Sentry is available and initialize if configured
      if (this.config.enableErrorTracking && process.env.SENTRY_DSN) {
        try {
          // Use dynamic import with string to avoid TypeScript module resolution
          const sentryModule = '@sentry/node';
          const Sentry = await import(sentryModule);
          Sentry.init({
            dsn: process.env.SENTRY_DSN,
            environment: process.env.NODE_ENV,
            tracesSampleRate: this.config.sampleRate,
            integrations: [
              new Sentry.Integrations.Http({ tracing: true }),
              new Sentry.Integrations.Express({ app: undefined }),
            ],
          });
          this.sentryAvailable = true;
          console.log('✅ Sentry error tracking initialized');
        } catch (error) {
          console.warn('⚠️ Sentry not available, error tracking disabled:', (error as Error).message);
          this.config.enableErrorTracking = false;
        }
      }

      // Check if New Relic is available and initialize if configured
      if (this.config.enableAPM && process.env.NEW_RELIC_LICENSE_KEY) {
        try {
          // Use dynamic require to avoid TypeScript module resolution
          const newRelicModule = 'newrelic';
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          require(newRelicModule);
          this.newRelicAvailable = true;
          console.log('✅ New Relic APM initialized');
        } catch (error) {
          console.warn('⚠️ New Relic not available, APM disabled:', (error as Error).message);
          this.config.enableAPM = false;
        }
      }

      this.isInitialized = true;
      console.log('✅ MonitoringService initialized successfully');
    } catch (error) {
      console.warn('⚠️ MonitoringService initialization failed:', error);
    }
  }

  public static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  public startTransaction(name: string, type: string, callback: () => any): any {
    if (this.config.enableAPM && this.newRelicAvailable && (global as any).newrelic) {
      return (global as any).newrelic.startWebTransaction(`${type}/${name}`, callback);
    }
    return callback();
  }

  public recordMetric(name: string, value: number, unit: string = 'count'): void {
    if (this.config.enableAPM && this.newRelicAvailable && (global as any).newrelic) {
      (global as any).newrelic.recordMetric(name, value);
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Metric: ${name} = ${value} ${unit}`);
    }
  }

  public recordError(error: Error, context?: Record<string, any>): void {
    if (this.config.enableErrorTracking && this.sentryAvailable) {
      try {
        // Use dynamic require to avoid TypeScript module resolution
        const sentryModule = '@sentry/node';
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const Sentry = require(sentryModule);
        Sentry.captureException(error, { extra: context });
      } catch (e) {
        console.error('Failed to record error to Sentry:', e);
      }
    }
    
    // Always log errors locally
    console.error('🚨 Error recorded:', error.message, context);
  }

  public recordPerformance(operation: string, duration: number, metadata?: Record<string, any>): void {
    this.recordMetric(`performance.${operation}.duration`, duration, 'ms');
    
    if (metadata) {
      Object.entries(metadata).forEach(([key, value]) => {
        if (typeof value === 'number') {
          this.recordMetric(`performance.${operation}.${key}`, value);
        }
      });
    }
  }

  public createPerformanceTimer(operation: string) {
    const startTime = Date.now();
    
    return {
      end: (metadata?: Record<string, any>) => {
        const duration = Date.now() - startTime;
        this.recordPerformance(operation, duration, metadata);
        return duration;
      }
    };
  }

  public getConfig(): MonitoringConfig {
    return { ...this.config };
  }

  public isMonitoringAvailable(): { sentry: boolean; newRelic: boolean } {
    return {
      sentry: this.sentryAvailable,
      newRelic: this.newRelicAvailable
    };
  }
}

export default MonitoringService;

// To initialize early in your app (e.g., top of server/src/index.ts):
// import './services/monitoring'; // This will run the constructor in MonitoringService.ts
// MonitoringService.getInstance(); // Or call getInstance() to ensure constructor runs
