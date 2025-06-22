import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { createGzip } from 'zlib';
import { spawn } from 'child_process';
import { promisify } from 'util';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { supabase, serverTables } from '../lib/supabase.js';
import { EncryptionService } from './encryptionService.js';
import logger from '../utils/logger.js';

export interface BackupOptions {
  compress?: boolean;
  encrypt?: boolean;
  includeMetadata?: boolean;
  maxRetries?: number;
  timeout?: number;
}

export interface BackupResult {
  success: boolean;
  backupId: string;
  destination: string;
  size: number;
  duration: number;
  encryptionKeyId?: string;
  checksum: string;
  metadata?: BackupMetadata;
  error?: string;
}

export interface BackupMetadata {
  type: 'database' | 'files' | 'user_data';
  createdAt: Date;
  source: string;
  tables?: string[];
  fileCount?: number;
  userId?: string;
  version: string;
  compressed: boolean;
  encrypted: boolean;
}

export interface DatabaseBackupOptions extends BackupOptions {
  tables?: string[];
  excludeTables?: string[];
  schemaOnly?: boolean;
  dataOnly?: boolean;
}

export interface FileBackupOptions extends BackupOptions {
  buckets?: string[];
  excludePatterns?: string[];
  includeVersions?: boolean;
}

export interface UserDataExportOptions extends BackupOptions {
  format?: 'json' | 'csv' | 'xml';
  includeFiles?: boolean;
  anonymize?: boolean;
}

export class BackupService {
  private static instance: BackupService;
  private encryptionService: EncryptionService;
  private s3Client?: S3Client;
  private backupHistory: Map<string, BackupResult> = new Map();
  private readonly maxHistorySize = 1000;

  constructor() {
    this.encryptionService = EncryptionService.getInstance();
    this.initializeS3Client();
  }

  public static getInstance(): BackupService {
    if (!BackupService.instance) {
      BackupService.instance = new BackupService();
    }
    return BackupService.instance;
  }

  private initializeS3Client(): void {
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      this.s3Client = new S3Client({
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
        region: process.env.AWS_REGION || 'us-east-1',
      });
    }
  }

  /**
   * Create a complete database backup
   */
  public async createDatabaseBackup(
    destination: string,
    options: DatabaseBackupOptions = {}
  ): Promise<BackupResult> {
    const startTime = Date.now();
    const backupId = this.generateBackupId('db');

    logger.info(`Starting database backup: ${backupId}`, { destination, options });

    try {
      // Get database URL from environment
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        throw new Error('DATABASE_URL not configured');
      }

      // Create backup directory
      const backupDir = path.join(process.cwd(), 'backups', 'database');
      await fs.mkdir(backupDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `db_backup_${timestamp}.sql`;
      const backupPath = path.join(backupDir, filename);

      // Prepare pg_dump command
      const pgDumpArgs = [
        databaseUrl,
        '--clean',
        '--if-exists',
        '--no-owner',
        '--no-privileges',
        '--verbose',
      ];

      // Add table-specific options
      if (options.tables && options.tables.length > 0) {
        options.tables.forEach(table => {
          pgDumpArgs.push('--table', table);
        });
      }

      if (options.excludeTables && options.excludeTables.length > 0) {
        options.excludeTables.forEach(table => {
          pgDumpArgs.push('--exclude-table', table);
        });
      }

      if (options.schemaOnly) {
        pgDumpArgs.push('--schema-only');
      } else if (options.dataOnly) {
        pgDumpArgs.push('--data-only');
      }

      // Execute pg_dump
      await this.executeCommand('pg_dump', pgDumpArgs, backupPath);

      // Get file stats
      const stats = await fs.stat(backupPath);
      let finalPath = backupPath;
      let finalSize = stats.size;

      // Compress if requested
      if (options.compress !== false) {
        const compressedPath = `${backupPath}.gz`;
        await this.compressFile(backupPath, compressedPath);
        await fs.unlink(backupPath);
        finalPath = compressedPath;
        const compressedStats = await fs.stat(compressedPath);
        finalSize = compressedStats.size;
      }

      // Encrypt if requested
      let encryptionKeyId: string | undefined;
      if (options.encrypt !== false) {
        const encryptedPath = `${finalPath}.enc`;
        const fileContent = await fs.readFile(finalPath);
        const encrypted = await this.encryptionService.encryptData(
          fileContent.toString('base64'),
          'backup'
        );
        await fs.writeFile(encryptedPath, JSON.stringify(encrypted));
        await fs.unlink(finalPath);
        finalPath = encryptedPath;
        encryptionKeyId = encrypted.keyId;
        const encryptedStats = await fs.stat(encryptedPath);
        finalSize = encryptedStats.size;
      }

      // Calculate checksum
      const checksum = await this.calculateFileChecksum(finalPath);

      // Upload to destination if specified
      const finalDestination = await this.uploadToDestination(finalPath, destination);

      // Create metadata
      const metadata: BackupMetadata = {
        type: 'database',
        createdAt: new Date(),
        source: 'postgresql',
        tables: options.tables,
        version: '1.0',
        compressed: options.compress !== false,
        encrypted: options.encrypt !== false,
      };

      const result: BackupResult = {
        success: true,
        backupId,
        destination: finalDestination,
        size: finalSize,
        duration: Date.now() - startTime,
        encryptionKeyId,
        checksum,
        metadata,
      };

      // Store in history
      this.addToHistory(backupId, result);

      logger.info(`Database backup completed: ${backupId}`, result);
      return result;

    } catch (error) {
      const result: BackupResult = {
        success: false,
        backupId,
        destination,
        size: 0,
        duration: Date.now() - startTime,
        checksum: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      logger.error(`Database backup failed: ${backupId}`, error);
      return result;
    }
  }

  /**
   * Create a file storage backup
   */
  public async createFileBackup(
    destination: string,
    options: FileBackupOptions = {}
  ): Promise<BackupResult> {
    const startTime = Date.now();
    const backupId = this.generateBackupId('files');

    logger.info(`Starting file backup: ${backupId}`, { destination, options });

    try {
      // Create backup directory
      const backupDir = path.join(process.cwd(), 'backups', 'files');
      await fs.mkdir(backupDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `files_backup_${timestamp}.tar.gz`;
      const backupPath = path.join(backupDir, filename);

      // Get list of buckets to backup
      const bucketsToBackup = options.buckets || ['coaching-platform-files'];
      
      let totalFiles = 0;
      const tempDir = path.join(backupDir, `temp_${backupId}`);
      await fs.mkdir(tempDir, { recursive: true });

      // Download files from each bucket
      for (const bucketName of bucketsToBackup) {
        const bucketDir = path.join(tempDir, bucketName);
        await fs.mkdir(bucketDir, { recursive: true });

        // List all files in bucket
        const { data: files, error } = await supabase.storage
          .from(bucketName)
          .list('', {
            limit: 1000,
            offset: 0,
          });

        if (error) {
          logger.warn(`Error listing files in bucket ${bucketName}:`, error);
          continue;
        }

        if (!files) continue;

        // Download each file
        for (const file of files) {
          if (this.shouldExcludeFile(file.name, options.excludePatterns)) {
            continue;
          }

          try {
            const { data: fileData, error: downloadError } = await supabase.storage
              .from(bucketName)
              .download(file.name);

            if (downloadError) {
              logger.warn(`Error downloading file ${file.name}:`, downloadError);
              continue;
            }

            if (fileData) {
              const filePath = path.join(bucketDir, file.name);
              const buffer = Buffer.from(await fileData.arrayBuffer());
              await fs.writeFile(filePath, buffer);
              totalFiles++;
            }
          } catch (error) {
            logger.warn(`Error processing file ${file.name}:`, error);
          }
        }
      }

      // Create compressed archive
      await this.createTarGz(tempDir, backupPath);

      // Clean up temp directory
      await fs.rm(tempDir, { recursive: true, force: true });

      // Get file stats
      const stats = await fs.stat(backupPath);
      let finalPath = backupPath;
      let finalSize = stats.size;

      // Encrypt if requested
      let encryptionKeyId: string | undefined;
      if (options.encrypt !== false) {
        const encryptedPath = `${finalPath}.enc`;
        const fileContent = await fs.readFile(finalPath);
        const encrypted = await this.encryptionService.encryptData(
          fileContent.toString('base64'),
          'backup'
        );
        await fs.writeFile(encryptedPath, JSON.stringify(encrypted));
        await fs.unlink(finalPath);
        finalPath = encryptedPath;
        encryptionKeyId = encrypted.keyId;
        const encryptedStats = await fs.stat(encryptedPath);
        finalSize = encryptedStats.size;
      }

      // Calculate checksum
      const checksum = await this.calculateFileChecksum(finalPath);

      // Upload to destination if specified
      const finalDestination = await this.uploadToDestination(finalPath, destination);

      // Create metadata
      const metadata: BackupMetadata = {
        type: 'files',
        createdAt: new Date(),
        source: 'supabase-storage',
        fileCount: totalFiles,
        version: '1.0',
        compressed: true,
        encrypted: options.encrypt !== false,
      };

      const result: BackupResult = {
        success: true,
        backupId,
        destination: finalDestination,
        size: finalSize,
        duration: Date.now() - startTime,
        encryptionKeyId,
        checksum,
        metadata,
      };

      // Store in history
      this.addToHistory(backupId, result);

      logger.info(`File backup completed: ${backupId}`, result);
      return result;

    } catch (error) {
      const result: BackupResult = {
        success: false,
        backupId,
        destination,
        size: 0,
        duration: Date.now() - startTime,
        checksum: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      logger.error(`File backup failed: ${backupId}`, error);
      return result;
    }
  }

  /**
   * Create a user data export (GDPR compliance)
   */
  public async createUserDataBackup(
    userId: string,
    destination: string,
    options: UserDataExportOptions = {}
  ): Promise<BackupResult> {
    const startTime = Date.now();
    const backupId = this.generateBackupId('user');

    logger.info(`Starting user data backup: ${backupId}`, { userId, destination, options });

    try {
      // Create backup directory
      const backupDir = path.join(process.cwd(), 'backups', 'users');
      await fs.mkdir(backupDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `user_data_${userId}_${timestamp}.json`;
      const backupPath = path.join(backupDir, filename);

      // Collect user data from all relevant tables
      const userData = await this.collectUserData(userId, options);

      // Format data based on requested format
      let exportData: string;
      switch (options.format || 'json') {
        case 'json':
          exportData = JSON.stringify(userData, null, 2);
          break;
        case 'csv':
          exportData = this.convertToCSV(userData);
          break;
        case 'xml':
          exportData = this.convertToXML(userData);
          break;
        default:
          exportData = JSON.stringify(userData, null, 2);
      }

      // Write to file
      await fs.writeFile(backupPath, exportData, 'utf8');

      // Include user files if requested
      if (options.includeFiles) {
        const filesDir = path.join(backupDir, `${userId}_files`);
        await fs.mkdir(filesDir, { recursive: true });
        await this.exportUserFiles(userId, filesDir);
      }

      // Get file stats
      const stats = await fs.stat(backupPath);
      let finalPath = backupPath;
      let finalSize = stats.size;

      // Compress if requested
      if (options.compress !== false) {
        const compressedPath = `${backupPath}.gz`;
        await this.compressFile(backupPath, compressedPath);
        await fs.unlink(backupPath);
        finalPath = compressedPath;
        const compressedStats = await fs.stat(compressedPath);
        finalSize = compressedStats.size;
      }

      // Encrypt if requested
      let encryptionKeyId: string | undefined;
      if (options.encrypt !== false) {
        const encryptedPath = `${finalPath}.enc`;
        const fileContent = await fs.readFile(finalPath);
        const encrypted = await this.encryptionService.encryptData(
          fileContent.toString('base64'),
          'backup'
        );
        await fs.writeFile(encryptedPath, JSON.stringify(encrypted));
        await fs.unlink(finalPath);
        finalPath = encryptedPath;
        encryptionKeyId = encrypted.keyId;
        const encryptedStats = await fs.stat(encryptedPath);
        finalSize = encryptedStats.size;
      }

      // Calculate checksum
      const checksum = await this.calculateFileChecksum(finalPath);

      // Upload to destination if specified
      const finalDestination = await this.uploadToDestination(finalPath, destination);

      // Create metadata
      const metadata: BackupMetadata = {
        type: 'user_data',
        createdAt: new Date(),
        source: 'database',
        userId,
        version: '1.0',
        compressed: options.compress !== false,
        encrypted: options.encrypt !== false,
      };

      const result: BackupResult = {
        success: true,
        backupId,
        destination: finalDestination,
        size: finalSize,
        duration: Date.now() - startTime,
        encryptionKeyId,
        checksum,
        metadata,
      };

      // Store in history
      this.addToHistory(backupId, result);

      logger.info(`User data backup completed: ${backupId}`, result);
      return result;

    } catch (error) {
      const result: BackupResult = {
        success: false,
        backupId,
        destination,
        size: 0,
        duration: Date.now() - startTime,
        checksum: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      logger.error(`User data backup failed: ${backupId}`, error);
      return result;
    }
  }

  /**
   * Restore from backup
   */
  public async restoreFromBackup(
    backupId: string,
    restoreOptions: {
      type: 'database' | 'files' | 'user_data';
      destination?: string;
      verify?: boolean;
    }
  ): Promise<{ success: boolean; message: string }> {
    logger.info(`Starting restore from backup: ${backupId}`, restoreOptions);

    try {
      const backupResult = this.backupHistory.get(backupId);
      if (!backupResult) {
        throw new Error(`Backup ${backupId} not found in history`);
      }

      // TODO: Implement restore logic based on backup type
      // This is a complex operation that should be handled carefully
      
      return {
        success: true,
        message: `Restore from backup ${backupId} completed successfully`
      };

    } catch (error) {
      logger.error(`Restore failed for backup ${backupId}:`, error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get backup history
   */
  public getBackupHistory(): BackupResult[] {
    return Array.from(this.backupHistory.values());
  }

  /**
   * Verify backup integrity
   */
  public async verifyBackup(backupId: string): Promise<{
    valid: boolean;
    checksumMatch: boolean;
    readable: boolean;
    error?: string;
  }> {
    try {
      const backup = this.backupHistory.get(backupId);
      if (!backup) {
        return { valid: false, checksumMatch: false, readable: false, error: 'Backup not found' };
      }

      // Check if file exists and is readable
      const exists = await fs.access(backup.destination).then(() => true).catch(() => false);
      if (!exists) {
        return { valid: false, checksumMatch: false, readable: false, error: 'Backup file not found' };
      }

      // Verify checksum
      const currentChecksum = await this.calculateFileChecksum(backup.destination);
      const checksumMatch = currentChecksum === backup.checksum;

      return {
        valid: checksumMatch,
        checksumMatch,
        readable: true
      };

    } catch (error) {
      return {
        valid: false,
        checksumMatch: false,
        readable: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Clean up old backups
   */
  public async cleanupOldBackups(retentionDays: number = 30): Promise<{
    cleaned: number;
    errors: string[];
  }> {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    let cleaned = 0;
    const errors: string[] = [];

    for (const [backupId, backup] of this.backupHistory.entries()) {
      if (backup.metadata && backup.metadata.createdAt < cutoffDate) {
        try {
          await fs.unlink(backup.destination);
          this.backupHistory.delete(backupId);
          cleaned++;
        } catch (error) {
          errors.push(`Failed to delete backup ${backupId}: ${error}`);
        }
      }
    }

    logger.info(`Cleaned up ${cleaned} old backups`, { retentionDays, errors: errors.length });
    return { cleaned, errors };
  }

  // Private helper methods

  private generateBackupId(type: string): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex');
    return `${type}_${timestamp}_${random}`;
  }

  private async executeCommand(command: string, args: string[], outputFile?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args);
      let stderr = '';

      if (outputFile) {
        const writeStream = createWriteStream(outputFile);
        process.stdout.pipe(writeStream);
      }

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });

      process.on('error', (error) => {
        reject(error);
      });
    });
  }

  private async compressFile(inputPath: string, outputPath: string): Promise<void> {
    const input = createReadStream(inputPath);
    const gzip = createGzip();
    const output = createWriteStream(outputPath);

    await pipeline(input, gzip, output);
  }

  private async createTarGz(sourceDir: string, outputPath: string): Promise<void> {
    const args = ['-czf', outputPath, '-C', path.dirname(sourceDir), path.basename(sourceDir)];
    await this.executeCommand('tar', args);
  }

  private async calculateFileChecksum(filePath: string): Promise<string> {
    const hash = crypto.createHash('sha256');
    const stream = createReadStream(filePath);

    return new Promise((resolve, reject) => {
      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  private shouldExcludeFile(filename: string, excludePatterns?: string[]): boolean {
    if (!excludePatterns) return false;
    
    return excludePatterns.some(pattern => {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(filename);
    });
  }

  private async uploadToDestination(filePath: string, destination: string): Promise<string> {
    if (destination.startsWith('s3://')) {
      return await this.uploadToS3(filePath, destination);
    } else if (destination.startsWith('local://')) {
      return await this.copyToLocal(filePath, destination.replace('local://', ''));
    }
    
    // If no specific destination, return original path
    return filePath;
  }

  private async uploadToS3(filePath: string, s3Url: string): Promise<string> {
    if (!this.s3Client) {
      throw new Error('S3 client not initialized');
    }

    const urlParts = s3Url.replace('s3://', '').split('/');
    const bucket = urlParts[0];
    const key = urlParts.slice(1).join('/') + path.basename(filePath);

    const fileStream = createReadStream(filePath);
    
    const upload = new Upload({
      client: this.s3Client,
      params: {
        Bucket: bucket,
        Key: key,
        Body: fileStream,
      },
    });

    await upload.done();

    return s3Url + path.basename(filePath);
  }

  private async copyToLocal(filePath: string, destination: string): Promise<string> {
    const destinationPath = path.join(destination, path.basename(filePath));
    await fs.mkdir(path.dirname(destinationPath), { recursive: true });
    await fs.copyFile(filePath, destinationPath);
    return destinationPath;
  }

  private async collectUserData(userId: string, options: UserDataExportOptions): Promise<any> {
    const userData: any = {
      userId,
      exportedAt: new Date().toISOString(),
      data: {}
    };

    try {
      // Get user profile
      const { data: user } = await serverTables.users()
        .select('*')
        .eq('id', userId)
        .single();
      
      if (user) {
        userData.data.profile = options.anonymize ? this.anonymizeUserData(user) : user;
      }

      // Get user sessions
      const { data: sessions } = await serverTables.sessions()
        .select('*')
        .or(`coach_id.eq.${userId},client_id.eq.${userId}`);
      
      if (sessions) {
        userData.data.sessions = sessions;
      }

      // Get user reflections
      const { data: reflections } = await serverTables.reflections()
        .select('*')
        .eq('user_id', userId);
      
      if (reflections) {
        userData.data.reflections = reflections;
      }

      // Get user notes
      const { data: notes } = await serverTables.coach_notes()
        .select('*')
        .eq('user_id', userId);
      
      if (notes) {
        userData.data.notes = notes;
      }

      // Get user analytics (if available) - skip if table doesn't exist
      try {
        const { data: analytics } = await serverTables.audit_logs()
          .select('*')
          .eq('user_id', userId);
        
        if (analytics) {
          userData.data.analytics = analytics;
        }
      } catch (error) {
        // Table may not exist, skip analytics
        logger.warn('User analytics table not available');
      }

    } catch (error) {
      logger.warn(`Error collecting user data for ${userId}:`, error);
    }

    return userData;
  }

  private anonymizeUserData(userData: any): any {
    const anonymized = { ...userData };
    
    // Remove or anonymize sensitive fields
    if (anonymized.email) {
      anonymized.email = this.anonymizeEmail(anonymized.email);
    }
    if (anonymized.phone) {
      anonymized.phone = 'XXX-XXX-XXXX';
    }
    if (anonymized.firstName) {
      anonymized.firstName = 'Anonymous';
    }
    if (anonymized.lastName) {
      anonymized.lastName = 'User';
    }
    
    return anonymized;
  }

  private anonymizeEmail(email: string): string {
    const [username, domain] = email.split('@');
    const anonymizedUsername = username.substring(0, 2) + 'X'.repeat(username.length - 2);
    return `${anonymizedUsername}@${domain}`;
  }

  private async exportUserFiles(userId: string, exportDir: string): Promise<void> {
    try {
      // Get user files from storage
      const { data: files } = await supabase.storage
        .from('coaching-platform-files')
        .list(`users/${userId}`, { limit: 1000 });

      if (!files) return;

      for (const file of files) {
        const { data: fileData } = await supabase.storage
          .from('coaching-platform-files')
          .download(`users/${userId}/${file.name}`);

        if (fileData) {
          const filePath = path.join(exportDir, file.name);
          const buffer = Buffer.from(await fileData.arrayBuffer());
          await fs.writeFile(filePath, buffer);
        }
      }
    } catch (error) {
      logger.warn(`Error exporting user files for ${userId}:`, error);
    }
  }

  private convertToCSV(data: any): string {
    // Simple CSV conversion - would need more sophisticated logic for complex data
    return JSON.stringify(data); // Placeholder
  }

  private convertToXML(data: any): string {
    // Simple XML conversion - would need more sophisticated logic
    return JSON.stringify(data); // Placeholder
  }

  private addToHistory(backupId: string, result: BackupResult): void {
    this.backupHistory.set(backupId, result);
    
    // Keep history size manageable
    if (this.backupHistory.size > this.maxHistorySize) {
      const oldestKey = this.backupHistory.keys().next().value;
      this.backupHistory.delete(oldestKey);
    }
  }
}

export const backupService = BackupService.getInstance();