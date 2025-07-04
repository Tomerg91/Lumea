import express from 'express';
import { QueueService } from '../services/queueService';
import { BackupService } from '../services/backupService';
import { isAuthenticated, hasRole } from '../middleware/auth';
import logger from '../utils/logger';

const router = express.Router();

// All operations routes require admin authentication
router.use(isAuthenticated);
router.use(hasRole('admin'));

/**
 * Queue Management Endpoints
 */

// Get queue statistics
router.get('/queues/stats', async (req, res) => {
  try {
    const queueService = QueueService.getInstance();
    const stats = await queueService.getQueueStats();
    
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get queue stats', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve queue statistics'
    });
  }
});

// Add email job to queue
router.post('/queues/email', async (req, res) => {
  try {
    const { to, subject, text, html, priority } = req.body;
    
    if (!to || !subject || (!text && !html)) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: to, subject, and (text or html)'
      });
    }

    const queueService = QueueService.getInstance();
    await queueService.addEmailJob({
      to,
      subject,
      text,
      html,
      priority
    });

    res.json({
      success: true,
      message: 'Email job added to queue successfully'
    });
  } catch (error) {
    logger.error('Failed to add email job', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to add email job to queue'
    });
  }
});

// Add analytics job to queue
router.post('/queues/analytics', async (req, res) => {
  try {
    const { type, userId, dateRange } = req.body;
    
    if (!type || !dateRange || !dateRange.start || !dateRange.end) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: type, dateRange.start, dateRange.end'
      });
    }

    const queueService = QueueService.getInstance();
    await queueService.addAnalyticsJob({
      type,
      userId,
      dateRange: {
        start: new Date(dateRange.start),
        end: new Date(dateRange.end)
      }
    });

    res.json({
      success: true,
      message: 'Analytics job added to queue successfully'
    });
  } catch (error) {
    logger.error('Failed to add analytics job', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to add analytics job to queue'
    });
  }
});

// Add notification job to queue
router.post('/queues/notification', async (req, res) => {
  try {
    const { userId, type, data, scheduledFor } = req.body;
    
    if (!userId || !type || !data) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: userId, type, data'
      });
    }

    const queueService = QueueService.getInstance();
    await queueService.addNotificationJob({
      userId,
      type,
      data,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined
    });

    res.json({
      success: true,
      message: 'Notification job added to queue successfully'
    });
  } catch (error) {
    logger.error('Failed to add notification job', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to add notification job to queue'
    });
  }
});

/**
 * Backup Management Endpoints
 */

// Create database backup
router.post('/backups/database', async (req, res) => {
  try {
    const { destination, options = {} } = req.body;
    
    if (!destination) {
      return res.status(400).json({
        success: false,
        message: 'Destination is required'
      });
    }

    const backupService = BackupService.getInstance();
    const result = await backupService.createDatabaseBackup(destination, options);
    
    res.json({
      success: result.success,
      data: result,
      message: result.success ? 'Database backup completed successfully' : 'Database backup failed'
    });
  } catch (error) {
    logger.error('Failed to create database backup', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to create database backup'
    });
  }
});

// Create file backup
router.post('/backups/files', async (req, res) => {
  try {
    const { destination, options = {} } = req.body;
    
    if (!destination) {
      return res.status(400).json({
        success: false,
        message: 'Destination is required'
      });
    }

    const backupService = BackupService.getInstance();
    const result = await backupService.createFileBackup(destination, options);
    
    res.json({
      success: result.success,
      data: result,
      message: result.success ? 'File backup completed successfully' : 'File backup failed'
    });
  } catch (error) {
    logger.error('Failed to create file backup', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to create file backup'
    });
  }
});

// Create user data export
router.post('/backups/user-data/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { destination, options = {} } = req.body;
    
    if (!destination) {
      return res.status(400).json({
        success: false,
        message: 'Destination is required'
      });
    }

    const backupService = BackupService.getInstance();
    const result = await backupService.createUserDataBackup(userId, destination, options);
    
    res.json({
      success: result.success,
      data: result,
      message: result.success ? 'User data export completed successfully' : 'User data export failed'
    });
  } catch (error) {
    logger.error('Failed to create user data export', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to create user data export'
    });
  }
});

// Get backup history
router.get('/backups/history', async (req, res) => {
  try {
    const backupService = BackupService.getInstance();
    const history = backupService.getBackupHistory();
    
    res.json({
      success: true,
      data: history,
      count: history.length
    });
  } catch (error) {
    logger.error('Failed to get backup history', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve backup history'
    });
  }
});

// Verify backup integrity
router.post('/backups/verify/:backupId', async (req, res) => {
  try {
    const { backupId } = req.params;
    
    const backupService = BackupService.getInstance();
    const verification = await backupService.verifyBackup(backupId);
    
    res.json({
      success: true,
      data: verification,
      message: verification.valid ? 'Backup verification successful' : 'Backup verification failed'
    });
  } catch (error) {
    logger.error('Failed to verify backup', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to verify backup'
    });
  }
});

// Cleanup old backups
router.delete('/backups/cleanup', async (req, res) => {
  try {
    const { retentionDays = 30 } = req.body;
    
    const backupService = BackupService.getInstance();
    const result = await backupService.cleanupOldBackups(retentionDays);
    
    res.json({
      success: true,
      data: result,
      message: `Cleaned up ${result.cleaned} old backups`
    });
  } catch (error) {
    logger.error('Failed to cleanup old backups', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup old backups'
    });
  }
});

/**
 * Scheduled Jobs Management
 */

// Schedule recurring jobs
router.post('/jobs/schedule-recurring', async (req, res) => {
  try {
    const queueService = QueueService.getInstance();
    await queueService.scheduleRecurringJobs();
    
    res.json({
      success: true,
      message: 'Recurring jobs scheduled successfully'
    });
  } catch (error) {
    logger.error('Failed to schedule recurring jobs', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to schedule recurring jobs'
    });
  }
});

export default router; 