import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { v4 as uuidv4 } from 'uuid';

// Storage bucket configuration
export const STORAGE_BUCKETS = {
  PROFILES: 'profiles',
  RESOURCES: 'resources',
  AUDIO_NOTES: 'audio-notes',
  DOCUMENTS: 'documents',
  SESSION_FILES: 'session-files',
} as const;

export type StorageBucket = typeof STORAGE_BUCKETS[keyof typeof STORAGE_BUCKETS];

// File context types
export type FileContext = 'profile' | 'resource' | 'audio_note' | 'document' | 'session_file';

// Upload progress interface
export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  speed?: number; // bytes per second
  timeRemaining?: number; // seconds
}

// File upload options
export interface FileUploadOptions {
  bucket?: StorageBucket;
  folder?: string;
  filename?: string;
  contentType?: string;
  cacheControl?: string;
  upsert?: boolean;
  onProgress?: (progress: UploadProgress) => void;
  maxRetries?: number;
}

// File upload result
export interface FileUploadResult {
  id: string;
  path: string;
  fullPath: string;
  url: string;
  publicUrl: string;
  size: number;
  contentType: string;
  filename: string;
  bucket: string;
  createdAt: string;
}

// File record for database
export interface FileRecord {
  id: string;
  user_id: string;
  filename: string;
  original_name: string;
  mimetype: string;
  size: number;
  storage_path: string;
  public_url: string;
  context: FileContext;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Audio-specific interfaces
export interface AudioUploadOptions extends FileUploadOptions {
  duration?: number;
  waveformData?: number[];
  transcription?: string;
}

export interface AudioUploadResult extends FileUploadResult {
  duration?: number;
  waveformData?: number[];
  transcription?: string;
}

// Helper function to get bucket for context
const getBucketForContext = (context: FileContext): StorageBucket => {
  const contextToBucket: Record<FileContext, StorageBucket> = {
    profile: STORAGE_BUCKETS.PROFILES,
    resource: STORAGE_BUCKETS.RESOURCES,
    audio_note: STORAGE_BUCKETS.AUDIO_NOTES,
    document: STORAGE_BUCKETS.DOCUMENTS,
    session_file: STORAGE_BUCKETS.SESSION_FILES,
  };
  
  return contextToBucket[context];
};

// Helper function to generate file path
const generateFilePath = (
  userId: string,
  context: FileContext,
  filename: string,
  folder?: string
): string => {
  const baseFolder = folder || context;
  const fileExtension = filename.split('.').pop();
  const uniqueFilename = `${uuidv4()}.${fileExtension}`;
  
  return `${userId}/${baseFolder}/${uniqueFilename}`;
};

// Main hook
export const useSupabaseStorage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);

  // Generic file upload mutation
  const uploadFileMutation = useMutation({
    mutationFn: async ({
      file,
      context,
      options = {}
    }: {
      file: File | Blob;
      context: FileContext;
      options?: FileUploadOptions;
    }): Promise<FileUploadResult> => {
      if (!user) throw new Error('User not authenticated');

      const bucket = options.bucket || getBucketForContext(context);
      const filename = options.filename || (file instanceof File ? file.name : `file-${Date.now()}`);
      const filePath = generateFilePath(user.id, context, filename, options.folder);
      const contentType = options.contentType || (file instanceof File ? file.type : 'application/octet-stream');

      // Track upload progress
      const startTime = Date.now();
      let lastLoaded = 0;

      const progressCallback = (progress: UploadProgress) => {
        const currentTime = Date.now();
        const timeElapsed = (currentTime - startTime) / 1000;
        const bytesUploaded = progress.loaded - lastLoaded;
        const speed = timeElapsed > 0 ? bytesUploaded / timeElapsed : 0;
        const timeRemaining = speed > 0 ? (progress.total - progress.loaded) / speed : undefined;

        const enhancedProgress = {
          ...progress,
          speed,
          timeRemaining,
        };

        setUploadProgress(enhancedProgress);
        options.onProgress?.(enhancedProgress);
        lastLoaded = progress.loaded;
      };

      try {
        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
          .from(bucket)
          .upload(filePath, file, {
            cacheControl: options.cacheControl || '3600',
            upsert: options.upsert || false,
            contentType,
          });

        if (error) throw error;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(filePath);

        // Create file record in database
        const fileRecord = {
          user_id: user.id,
          filename: filename,
          original_name: filename,
          mimetype: contentType,
          size: file.size,
          storage_path: filePath,
          public_url: urlData.publicUrl,
          context,
          created_at: new Date().toISOString(),
        };

        const { data: dbRecord, error: dbError } = await supabase
          .from('files')
          .insert([fileRecord])
          .select()
          .single();

        if (dbError) {
          console.error('Failed to create file record:', dbError);
          // Continue without database record - file is still uploaded
        }

        const result: FileUploadResult = {
          id: dbRecord?.id || data.id || uuidv4(),
          path: data.path,
          fullPath: data.fullPath,
          url: urlData.publicUrl,
          publicUrl: urlData.publicUrl,
          size: file.size,
          contentType,
          filename,
          bucket,
          createdAt: new Date().toISOString(),
        };

        // Final progress update
        progressCallback({
          loaded: file.size,
          total: file.size,
          percentage: 100,
        });

        return result;
      } catch (error) {
        setUploadProgress(null);
        throw error;
      } finally {
        // Clear progress after a delay
        setTimeout(() => setUploadProgress(null), 2000);
      }
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['audio-files'] });
    },
  });

  // Audio-specific upload mutation
  const uploadAudioMutation = useMutation({
    mutationFn: async ({
      audioBlob,
      filename,
      duration,
      options = {}
    }: {
      audioBlob: Blob;
      filename?: string;
      duration?: number;
      options?: AudioUploadOptions;
    }): Promise<AudioUploadResult> => {
      const file = new File([audioBlob], filename || `audio-${Date.now()}.${audioBlob.type.split('/')[1]}`, {
        type: audioBlob.type,
      });

      const uploadResult = await uploadFileMutation.mutateAsync({
        file,
        context: 'audio_note',
        options: {
          ...options,
          contentType: audioBlob.type,
        },
      });

      return {
        ...uploadResult,
        duration,
        waveformData: options.waveformData,
        transcription: options.transcription,
      };
    },
  });

  // File deletion mutation
  const deleteFileMutation = useMutation({
    mutationFn: async ({ fileId, filePath, bucket }: { fileId?: string; filePath?: string; bucket?: StorageBucket }) => {
      if (!user) throw new Error('User not authenticated');

      // Delete from storage if path and bucket provided
      if (filePath && bucket) {
        const { error: storageError } = await supabase.storage
          .from(bucket)
          .remove([filePath]);

        if (storageError) {
          console.error('Storage deletion error:', storageError);
        }
      }

      // Delete from database if fileId provided
      if (fileId) {
        const { error: dbError } = await supabase
          .from('files')
          .delete()
          .eq('id', fileId)
          .eq('user_id', user.id);

        if (dbError) throw dbError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['audio-files'] });
    },
  });

  // Get user files query
  const useUserFiles = (context?: FileContext) => {
    return useQuery({
      queryKey: ['files', user?.id, context],
      queryFn: async (): Promise<FileRecord[]> => {
        if (!user) return [];

        let query = supabase
          .from('files')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (context) {
          query = query.eq('context', context);
        }

        const { data, error } = await query;

        if (error) throw error;
        return data || [];
      },
      enabled: !!user,
    });
  };

  // Get signed URL for private files
  const getSignedUrl = useCallback(async (
    bucket: StorageBucket,
    path: string,
    expiresIn: number = 3600
  ): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn);

      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }
  }, []);

  // Download file
  const downloadFile = useCallback(async (
    bucket: StorageBucket,
    path: string
  ): Promise<Blob | null> => {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .download(path);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error downloading file:', error);
      return null;
    }
  }, []);

  return {
    // Upload operations
    uploadFile: uploadFileMutation.mutateAsync,
    uploadAudio: uploadAudioMutation.mutateAsync,
    deleteFile: deleteFileMutation.mutateAsync,
    
    // Upload state
    isUploading: uploadFileMutation.isPending || uploadAudioMutation.isPending,
    uploadProgress,
    uploadError: uploadFileMutation.error || uploadAudioMutation.error,
    
    // File operations
    getSignedUrl,
    downloadFile,
    
    // Query hooks
    useUserFiles,
    
    // Mutations for direct use
    uploadFileMutation,
    uploadAudioMutation,
    deleteFileMutation,
  };
};

// Convenience hooks for specific file types
export const useAudioStorage = () => {
  const storage = useSupabaseStorage();
  
  return {
    uploadAudio: storage.uploadAudio,
    isUploading: storage.isUploading,
    uploadProgress: storage.uploadProgress,
    uploadError: storage.uploadError,
    useAudioFiles: () => storage.useUserFiles('audio_note'),
    deleteAudio: storage.deleteFile,
  };
};

export const useImageStorage = () => {
  const storage = useSupabaseStorage();
  
  return {
    uploadImage: (file: File, options?: FileUploadOptions) => 
      storage.uploadFile({ file, context: 'profile', options }),
    isUploading: storage.isUploading,
    uploadProgress: storage.uploadProgress,
    uploadError: storage.uploadError,
    useImages: () => storage.useUserFiles('profile'),
    deleteImage: storage.deleteFile,
  };
};

export const useDocumentStorage = () => {
  const storage = useSupabaseStorage();
  
  return {
    uploadDocument: (file: File, options?: FileUploadOptions) => 
      storage.uploadFile({ file, context: 'document', options }),
    isUploading: storage.isUploading,
    uploadProgress: storage.uploadProgress,
    uploadError: storage.uploadError,
    useDocuments: () => storage.useUserFiles('document'),
    deleteDocument: storage.deleteFile,
  };
}; 