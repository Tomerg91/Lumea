import { supabase } from './supabase.js';
import { v4 as uuidv4 } from 'uuid';

export interface FileUploadOptions {
  bucket: string;
  path?: string;
  upsert?: boolean;
  cacheControl?: string;
  contentType?: string;
}

export interface FileUploadResult {
  id: string;
  path: string;
  fullPath: string;
  url: string;
  size: number;
  mimetype: string;
  filename: string;
}

export interface FileDownloadResult {
  data: Blob;
  error?: string;
}

export class SupabaseFileStorage {
  // Available buckets based on our migration files
  static readonly BUCKETS = {
    PROFILES: 'profiles',
    RESOURCES: 'resources', 
    AUDIO_NOTES: 'audio-notes',
    DOCUMENTS: 'documents',
    SESSION_FILES: 'session-files',
  } as const;

  /**
   * Upload a file to Supabase Storage
   */
  async uploadFile(
    file: Buffer | Blob | File,
    filename: string,
    options: FileUploadOptions
  ): Promise<FileUploadResult> {
    try {
      // Generate unique filename to avoid conflicts
      const fileExtension = filename.split('.').pop();
      const uniqueFilename = `${uuidv4()}.${fileExtension}`;
      const filePath = options.path ? `${options.path}/${uniqueFilename}` : uniqueFilename;

      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from(options.bucket)
        .upload(filePath, file, {
          upsert: options.upsert || false,
          cacheControl: options.cacheControl || '3600',
          contentType: options.contentType,
        });

      if (error) {
        throw new Error(`Failed to upload file: ${error.message}`);
      }

      // Get public URL for the uploaded file
      const { data: urlData } = supabase.storage
        .from(options.bucket)
        .getPublicUrl(filePath);

      // Get file size
      let fileSize = 0;
      if (file instanceof Buffer) {
        fileSize = file.length;
      } else if (file instanceof Blob || file instanceof File) {
        fileSize = file.size;
      }

      return {
        id: data.id || data.path || uuidv4(),
        path: data.path,
        fullPath: data.fullPath,
        url: urlData.publicUrl,
        size: fileSize,
        mimetype: options.contentType || 'application/octet-stream',
        filename: filename,
      };
    } catch (error) {
      console.error('Error uploading file to Supabase Storage:', error);
      throw error;
    }
  }

  /**
   * Download a file from Supabase Storage
   */
  async downloadFile(bucket: string, path: string): Promise<FileDownloadResult> {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .download(path);

      if (error) {
        return { data: new Blob([]), error: error.message };
      }

      return { data };
    } catch (error) {
      console.error('Error downloading file from Supabase Storage:', error);
      return { 
        data: new Blob([]), 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Delete a file from Supabase Storage
   */
  async deleteFile(bucket: string, path: string): Promise<boolean> {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) {
        console.error('Error deleting file from Supabase Storage:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error deleting file from Supabase Storage:', error);
      return false;
    }
  }

  /**
   * Get public URL for a file
   */
  getPublicUrl(bucket: string, path: string): string {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);
    
    return data.publicUrl;
  }

  /**
   * Create a signed URL for temporary access
   */
  async createSignedUrl(
    bucket: string, 
    path: string, 
    expiresIn: number = 3600
  ): Promise<string | null> {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn);

      if (error) {
        console.error('Error creating signed URL:', error);
        return null;
      }

      return data.signedUrl;
    } catch (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }
  }

  /**
   * List files in a bucket/folder
   */
  async listFiles(bucket: string, folder?: string, limit?: number) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .list(folder, {
          limit: limit || 100,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) {
        console.error('Error listing files:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error listing files:', error);
      return [];
    }
  }

  /**
   * Get file metadata
   */
  async getFileInfo(bucket: string, path: string) {
    try {
      const files = await this.listFiles(bucket, path.split('/').slice(0, -1).join('/'));
      const filename = path.split('/').pop();
      return files.find(file => file.name === filename);
    } catch (error) {
      console.error('Error getting file info:', error);
      return null;
    }
  }

  /**
   * Upload file with automatic bucket selection based on context
   */
  async uploadFileByContext(
    file: Buffer | Blob | File,
    filename: string,
    context: 'profile' | 'resource' | 'audio_note' | 'document' | 'session_file',
    userId: string,
    options: Partial<FileUploadOptions> = {}
  ): Promise<FileUploadResult> {
    // Map context to bucket
    const bucketMap = {
      profile: SupabaseFileStorage.BUCKETS.PROFILES,
      resource: SupabaseFileStorage.BUCKETS.RESOURCES,
      audio_note: SupabaseFileStorage.BUCKETS.AUDIO_NOTES,
      document: SupabaseFileStorage.BUCKETS.DOCUMENTS,
      session_file: SupabaseFileStorage.BUCKETS.SESSION_FILES,
    };

    const bucket = bucketMap[context];
    const path = options.path || `${userId}/${context}`;

    return this.uploadFile(file, filename, {
      bucket,
      path,
      ...options,
    });
  }

  /**
   * Migrate a file from URL to Supabase Storage
   */
  async migrateFileFromUrl(
    sourceUrl: string,
    filename: string,
    options: FileUploadOptions
  ): Promise<FileUploadResult | null> {
    try {
      // Download file from source URL
      const response = await fetch(sourceUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch file from ${sourceUrl}`);
      }

      const fileBlob = await response.blob();
      
      // Upload to Supabase Storage
      return await this.uploadFile(fileBlob, filename, {
        ...options,
        contentType: response.headers.get('content-type') || undefined,
      });
    } catch (error) {
      console.error('Error migrating file from URL:', error);
      return null;
    }
  }
}

// Export singleton instance
export const supabaseFileStorage = new SupabaseFileStorage(); 