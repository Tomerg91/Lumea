import { ReflectionAnswer } from '../types/reflection';

const API_BASE = process.env.REACT_APP_API_URL || '/api';

export interface AudioUploadProgress {
  uploaded: number;
  total: number;
  percentage: number;
  speed?: number; // bytes per second
  eta?: number; // estimated time remaining in seconds
}

export interface AudioUploadResult {
  fileId: string;
  s3Key: string;
  url: string;
  size: number;
  duration: number;
  mimeType: string;
}

export interface AudioUploadOptions {
  onProgress?: (progress: AudioUploadProgress) => void;
  onRetry?: (attempt: number, maxAttempts: number) => void;
  maxRetries?: number;
  chunkSize?: number;
  timeout?: number;
}

class AudioUploadService {
  private readonly defaultOptions: Required<AudioUploadOptions> = {
    onProgress: () => {},
    onRetry: () => {},
    maxRetries: 3,
    chunkSize: 5 * 1024 * 1024, // 5MB chunks
    timeout: 30000, // 30 seconds
  };

  /**
   * Get a presigned URL for uploading audio to S3
   */
  private async getPresignedUrl(
    mimeType: string,
    fileSize: number
  ): Promise<{ presignedUrl: string; objectKey: string }> {
    const response = await fetch(`${API_BASE}/audio/presigned-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        mimeType,
        fileSize,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to get upload URL' }));
      throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Upload audio blob to S3 using presigned URL
   */
  private async uploadToS3(
    presignedUrl: string,
    audioBlob: Blob,
    options: Required<AudioUploadOptions>
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const startTime = Date.now();
      let lastProgress = 0;

      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const currentTime = Date.now();
          const elapsedTime = (currentTime - startTime) / 1000; // seconds
          const uploadedSinceLastUpdate = event.loaded - lastProgress;
          const speed = uploadedSinceLastUpdate / elapsedTime;
          const eta = speed > 0 ? (event.total - event.loaded) / speed : undefined;

          const progress: AudioUploadProgress = {
            uploaded: event.loaded,
            total: event.total,
            percentage: Math.round((event.loaded / event.total) * 100),
            speed,
            eta,
          };

          options.onProgress(progress);
          lastProgress = event.loaded;
        }
      });

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed due to network error'));
      });

      // Handle timeout
      xhr.addEventListener('timeout', () => {
        reject(new Error('Upload timed out'));
      });

      // Configure and send request
      xhr.timeout = options.timeout;
      xhr.open('PUT', presignedUrl);
      xhr.setRequestHeader('Content-Type', audioBlob.type);
      xhr.send(audioBlob);
    });
  }

  /**
   * Create a file record in the database after successful upload
   */
  private async createFileRecord(
    s3Key: string,
    audioBlob: Blob,
    duration: number
  ): Promise<AudioUploadResult> {
    const response = await fetch(`${API_BASE}/audio/files`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        s3Key,
        filename: `audio-${Date.now()}.${audioBlob.type.split('/')[1]}`,
        mimeType: audioBlob.type,
        size: audioBlob.size,
        duration,
        context: 'audio_note',
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to create file record' }));
      throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Upload audio with retry logic
   */
  private async uploadWithRetry(
    audioBlob: Blob,
    duration: number,
    options: Required<AudioUploadOptions>
  ): Promise<AudioUploadResult> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= options.maxRetries; attempt++) {
      try {
        // Get presigned URL
        const { presignedUrl, objectKey } = await this.getPresignedUrl(
          audioBlob.type,
          audioBlob.size
        );

        // Upload to S3
        await this.uploadToS3(presignedUrl, audioBlob, options);

        // Create file record
        const result = await this.createFileRecord(objectKey, audioBlob, duration);

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < options.maxRetries) {
          options.onRetry(attempt, options.maxRetries);
          // Exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Upload failed after all retry attempts');
  }

  /**
   * Compress audio blob if needed (basic implementation)
   */
  private async compressAudio(audioBlob: Blob): Promise<Blob> {
    // For now, return the original blob
    // TODO: Implement audio compression using Web Audio API or similar
    return audioBlob;
  }

  /**
   * Main upload method - uploads audio and returns file information
   */
  async uploadAudio(
    audioBlob: Blob,
    duration: number,
    options: Partial<AudioUploadOptions> = {}
  ): Promise<AudioUploadResult> {
    const mergedOptions = { ...this.defaultOptions, ...options };

    // Validate input
    if (!audioBlob || audioBlob.size === 0) {
      throw new Error('No audio data provided');
    }

    if (!audioBlob.type.startsWith('audio/')) {
      throw new Error('File must be an audio file');
    }

    if (audioBlob.size > 20 * 1024 * 1024) { // 20MB limit
      throw new Error('Audio file too large (max 20MB)');
    }

    try {
      // Initialize progress
      mergedOptions.onProgress({
        uploaded: 0,
        total: audioBlob.size,
        percentage: 0,
      });

      // Compress if needed
      const compressedBlob = await this.compressAudio(audioBlob);

      // Upload with retry logic
      const result = await this.uploadWithRetry(compressedBlob, duration, mergedOptions);

      // Final progress update
      mergedOptions.onProgress({
        uploaded: audioBlob.size,
        total: audioBlob.size,
        percentage: 100,
      });

      return result;
    } catch (error) {
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * Update reflection answer with uploaded audio information
   */
  updateReflectionAnswerWithUpload(
    answer: ReflectionAnswer,
    uploadResult: AudioUploadResult
  ): ReflectionAnswer {
    return {
      ...answer,
      value: 'audio_uploaded', // Update flag to indicate successful upload
      audioData: {
        blob: answer.audioData?.blob || new Blob(), // Keep original blob for local playback during session
        url: uploadResult.url, // S3 URL for persistence
        duration: uploadResult.duration,
        mimeType: uploadResult.mimeType,
        size: uploadResult.size,
      },
      // Store S3 information for backend
      s3Key: uploadResult.s3Key,
      fileId: uploadResult.fileId,
    };
  }

  /**
   * Delete an uploaded audio file
   */
  async deleteAudio(fileId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/audio/files/${fileId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to delete audio file' }));
      throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
    }
  }
}

export const audioUploadService = new AudioUploadService(); 