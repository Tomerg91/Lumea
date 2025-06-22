import { Queue, Worker, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import { logger } from './logger';

interface EmailJob {
  to: string;
  subject: string;
  text: string;
  html: string;
  priority?: number;
}

interface AnalyticsJob {
  type: 'session_metrics' | 'user_activity' | 'revenue_report';
  userId?: string;
  dateRange: {
    start: Date;
    end: Date;
  };
}

interface BackupJob {
  type: 'database' | 'files' | 'user_data';
  userId?: string;
  destination: string;
}

interface NotificationJob {
  userId: string;
  type: 'session_reminder' | 'feedback_request' | 'system_alert';
  data: any;
  scheduledFor?: Date;
}

export class QueueService {
  private static instance: QueueService;
  private redis: IORedis;
  
  // Queue instances
  private emailQueue: Queue<EmailJob>;
  private analyticsQueue: Queue<AnalyticsJob>;
  private backupQueue: Queue<BackupJob>;
  private notificationQueue: Queue<NotificationJob>;
  
  // Workers
  private emailWorker?: Worker<EmailJob>;
  private analyticsWorker?: Worker<AnalyticsJob>;
  private backupWorker?: Worker<BackupJob>;
  private notificationWorker?: Worker<NotificationJob>;
  
  // Queue Events
  private emailEvents?: QueueEvents;
  private analyticsEvents?: QueueEvents;
  private backupEvents?: QueueEvents;
  private notificationEvents?: QueueEvents;

  private isInitialized = false;

  constructor() {
    if (QueueService.instance) {
      return QueueService.instance;
    }

    // Initialize Redis connection
    this.redis = new IORedis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      lazyConnect: true,
    });

    // Initialize queues
    const redisConfig = {
      connection: this.redis,
    };

    this.emailQueue = new Queue<EmailJob>('email-processing', redisConfig);
    this.analyticsQueue = new Queue<AnalyticsJob>('analytics-processing', redisConfig);
    this.backupQueue = new Queue<BackupJob>('backup-processing', redisConfig);
    this.notificationQueue = new Queue<NotificationJob>('notification-processing', redisConfig);

    QueueService.instance = this;
  }

  /**
   * Initialize the queue service with workers
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.info('Queue service already initialized');
      return;
    }

    try {
      // Connect to Redis
      await this.redis.connect();
      logger.info('Connected to Redis for queue processing');

      // Initialize workers
      await this.initializeWorkers();
      
      // Initialize queue events
      await this.initializeQueueEvents();

      this.isInitialized = true;
      logger.info('Queue service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize queue service:', error);
      throw error;
    }
  }

  /**
   * Initialize all workers
   */
  private async initializeWorkers(): Promise<void> {
    const redisConfig = {
      connection: this.redis,
    };

    // Email Worker
    this.emailWorker = new Worker<EmailJob>(
      'email-processing',
      async (job) => {
        return await this.processEmailJob(job.data);
      },
      {
        ...redisConfig,
        concurrency: 10, // Process 10 emails concurrently
        limiter: {
          max: 100, // 100 emails per minute
          duration: 60000,
        },
      }
    );

    // Analytics Worker
    this.analyticsWorker = new Worker<AnalyticsJob>(
      'analytics-processing',
      async (job) => {
        return await this.processAnalyticsJob(job.data);
      },
      {
        ...redisConfig,
        concurrency: 3, // Analytics can be resource-intensive
        limiter: {
          max: 20, // 20 analytics jobs per minute
          duration: 60000,
        },
      }
    );

    // Backup Worker
    this.backupWorker = new Worker<BackupJob>(
      'backup-processing',
      async (job) => {
        return await this.processBackupJob(job.data);
      },
      {
        ...redisConfig,
        concurrency: 1, // Sequential backup processing
        limiter: {
          max: 5, // 5 backup jobs per hour
          duration: 3600000,
        },
      }
    );

    // Notification Worker
    this.notificationWorker = new Worker<NotificationJob>(
      'notification-processing',
      async (job) => {
        return await this.processNotificationJob(job.data);
      },
      {
        ...redisConfig,
        concurrency: 15, // High concurrency for notifications
        limiter: {
          max: 200, // 200 notifications per minute
          duration: 60000,
        },
      }
    );

    logger.info('All queue workers initialized');
  }

  /**
   * Initialize queue event listeners
   */
  private async initializeQueueEvents(): Promise<void> {
    const redisConfig = {
      connection: this.redis,
    };

    // Email Events
    this.emailEvents = new QueueEvents('email-processing', redisConfig);
    this.emailEvents.on('completed', (jobId) => {
      logger.info(`Email job ${jobId} completed`);
    });
    this.emailEvents.on('failed', (jobId, err) => {
      logger.error(`Email job ${jobId} failed:`, err);
    });

    // Analytics Events
    this.analyticsEvents = new QueueEvents('analytics-processing', redisConfig);
    this.analyticsEvents.on('completed', (jobId) => {
      logger.info(`Analytics job ${jobId} completed`);
    });
    this.analyticsEvents.on('failed', (jobId, err) => {
      logger.error(`Analytics job ${jobId} failed:`, err);
    });

    // Backup Events
    this.backupEvents = new QueueEvents('backup-processing', redisConfig);
    this.backupEvents.on('completed', (jobId) => {
      logger.info(`Backup job ${jobId} completed`);
    });
    this.backupEvents.on('failed', (jobId, err) => {
      logger.error(`Backup job ${jobId} failed:`, err);
    });

    // Notification Events
    this.notificationEvents = new QueueEvents('notification-processing', redisConfig);
    this.notificationEvents.on('completed', (jobId) => {
      logger.info(`Notification job ${jobId} completed`);
    });
    this.notificationEvents.on('failed', (jobId, err) => {
      logger.error(`Notification job ${jobId} failed:`, err);
    });

    logger.info('Queue event listeners initialized');
  }

  /**
   * Add email to processing queue
   */
  public async addEmailJob(emailData: EmailJob, options?: {
    delay?: number;
    priority?: number;
    attempts?: number;
  }): Promise<void> {
    try {
      await this.emailQueue.add('send-email', emailData, {
        delay: options?.delay,
        priority: options?.priority || emailData.priority || 0,
        attempts: options?.attempts || 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 50, // Keep last 50 failed jobs
      });
      
      logger.info('Email job added to queue');
    } catch (error) {
      logger.error('Failed to add email job to queue:', error);
      throw error;
    }
  }

  /**
   * Add analytics job to processing queue
   */
  public async addAnalyticsJob(analyticsData: AnalyticsJob, options?: {
    delay?: number;
    priority?: number;
  }): Promise<void> {
    try {
      await this.analyticsQueue.add('process-analytics', analyticsData, {
        delay: options?.delay,
        priority: options?.priority || 0,
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: 50,
        removeOnFail: 25,
      });
      
      logger.info('Analytics job added to queue');
    } catch (error) {
      logger.error('Failed to add analytics job to queue:', error);
      throw error;
    }
  }

  /**
   * Add backup job to processing queue
   */
  public async addBackupJob(backupData: BackupJob, options?: {
    delay?: number;
    priority?: number;
  }): Promise<void> {
    try {
      await this.backupQueue.add('create-backup', backupData, {
        delay: options?.delay,
        priority: options?.priority || 0,
        attempts: 1, // Backups should not retry automatically
        removeOnComplete: 10,
        removeOnFail: 10,
      });
      
      logger.info('Backup job added to queue');
    } catch (error) {
      logger.error('Failed to add backup job to queue:', error);
      throw error;
    }
  }

  /**
   * Add notification job to processing queue
   */
  public async addNotificationJob(notificationData: NotificationJob, options?: {
    delay?: number;
    priority?: number;
  }): Promise<void> {
    try {
      const delay = notificationData.scheduledFor 
        ? notificationData.scheduledFor.getTime() - Date.now()
        : options?.delay;

      await this.notificationQueue.add('send-notification', notificationData, {
        delay: delay > 0 ? delay : undefined,
        priority: options?.priority || 0,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: 200,
        removeOnFail: 100,
      });
      
      logger.info('Notification job added to queue');
    } catch (error) {
      logger.error('Failed to add notification job to queue:', error);
      throw error;
    }
  }

  /**
   * Process email job
   */
  private async processEmailJob(emailData: EmailJob): Promise<void> {
    const { EmailService } = await import('./emailService');
    const emailService = new EmailService();
    
    await emailService.sendEmail({
      to: emailData.to,
      subject: emailData.subject,
      text: emailData.text,
      html: emailData.html,
    });

    logger.info(`Email sent to ${emailData.to}`);
  }

  /**
   * Process analytics job
   */
  private async processAnalyticsJob(analyticsData: AnalyticsJob): Promise<void> {
    const { AnalyticsService } = await import('./analyticsService');
    const analyticsService = new AnalyticsService();

    switch (analyticsData.type) {
      case 'session_metrics':
        await analyticsService.calculateSessionMetrics(analyticsData.dateRange);
        break;
      case 'user_activity':
        await analyticsService.analyzeUserActivity(analyticsData.dateRange);
        break;
      case 'revenue_report':
        await analyticsService.generateRevenueReport(analyticsData.dateRange);
        break;
    }

    logger.info(`Analytics job processed: ${analyticsData.type}`);
  }

  /**
   * Process backup job
   */
  private async processBackupJob(backupData: BackupJob): Promise<void> {
    // Import backup services dynamically to avoid circular dependencies
    const { BackupService } = await import('./backupService');
    const backupService = new BackupService();

    switch (backupData.type) {
      case 'database':
        await backupService.createDatabaseBackup(backupData.destination);
        break;
      case 'files':
        await backupService.createFileBackup(backupData.destination);
        break;
      case 'user_data':
        if (backupData.userId) {
          await backupService.createUserDataBackup(backupData.userId, backupData.destination);
        }
        break;
    }

    logger.info(`Backup job processed: ${backupData.type}`);
  }

  /**
   * Process notification job
   */
  private async processNotificationJob(notificationData: NotificationJob): Promise<void> {
    const { NotificationService } = await import('./notificationService');
    const notificationService = new NotificationService();

    await notificationService.sendNotification(
      notificationData.userId,
      notificationData.type,
      notificationData.data
    );

    logger.info(`Notification sent to user ${notificationData.userId}`);
  }

  /**
   * Get queue statistics
   */
  public async getQueueStats(): Promise<{
    email: any;
    analytics: any;
    backup: any;
    notification: any;
  }> {
    const [emailStats, analyticsStats, backupStats, notificationStats] = await Promise.all([
      this.emailQueue.getJobCounts(),
      this.analyticsQueue.getJobCounts(),
      this.backupQueue.getJobCounts(),
      this.notificationQueue.getJobCounts(),
    ]);

    return {
      email: emailStats,
      analytics: analyticsStats,
      backup: backupStats,
      notification: notificationStats,
    };
  }

  /**
   * Schedule recurring jobs
   */
  public async scheduleRecurringJobs(): Promise<void> {
    // Daily analytics processing
    await this.analyticsQueue.add(
      'daily-analytics',
      {
        type: 'session_metrics',
        dateRange: {
          start: new Date(Date.now() - 24 * 60 * 60 * 1000),
          end: new Date(),
        },
      },
      {
        repeat: { pattern: '0 2 * * *' }, // Daily at 2 AM
        removeOnComplete: 5,
        removeOnFail: 3,
      }
    );

    // Weekly backup
    await this.backupQueue.add(
      'weekly-backup',
      {
        type: 'database',
        destination: 's3://backups/weekly/',
      },
      {
        repeat: { pattern: '0 3 * * 0' }, // Weekly on Sunday at 3 AM
        removeOnComplete: 4,
        removeOnFail: 2,
      }
    );

    logger.info('Recurring jobs scheduled');
  }

  /**
   * Graceful shutdown
   */
  public async shutdown(): Promise<void> {
    logger.info('Shutting down queue service...');

    // Close workers
    await Promise.all([
      this.emailWorker?.close(),
      this.analyticsWorker?.close(),
      this.backupWorker?.close(),
      this.notificationWorker?.close(),
    ]);

    // Close queue events
    await Promise.all([
      this.emailEvents?.close(),
      this.analyticsEvents?.close(),
      this.backupEvents?.close(),
      this.notificationEvents?.close(),
    ]);

    // Close queues
    await Promise.all([
      this.emailQueue.close(),
      this.analyticsQueue.close(),
      this.backupQueue.close(),
      this.notificationQueue.close(),
    ]);

    // Close Redis connection
    await this.redis.quit();

    this.isInitialized = false;
    logger.info('Queue service shut down successfully');
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): QueueService {
    if (!QueueService.instance) {
      QueueService.instance = new QueueService();
    }
    return QueueService.instance;
  }
}

export const queueService = QueueService.getInstance(); 