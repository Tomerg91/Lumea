import { Request, Response } from 'express';
import { z } from 'zod';
import { getPresignedAudioUploadUrl } from '../utils/s3/getPresignedUrl.js';
import { createFileRecord, deleteFileRecord, getFileById } from '../storage.js';

// Validation schemas
const presignedUrlRequestSchema = z.object({
  mimeType: z.string().refine(
    (type) => type.startsWith('audio/'),
    'MIME type must be an audio format'
  ),
  fileSize: z.number().min(1).max(20 * 1024 * 1024), // Max 20MB
});

const createFileRequestSchema = z.object({
  s3Key: z.string().min(1),
  filename: z.string().min(1),
  mimeType: z.string(),
  size: z.number().min(1),
  duration: z.number().min(0),
  context: z.enum(['profile', 'resource', 'audio_note']).optional(),
});

export const audioController = {
  // Get presigned URL for audio upload
  async getPresignedUploadUrl(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const validatedData = presignedUrlRequestSchema.parse(req.body);
      const userId = req.user.id.toString();

      const { presignedUrl, objectKey } = await getPresignedAudioUploadUrl(
        userId,
        validatedData.mimeType,
        validatedData.fileSize
      );

      res.json({
        presignedUrl,
        objectKey,
        expiresIn: 3600, // 1 hour
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: error.errors 
        });
      }

      console.error('Error generating presigned URL:', error);
      const message = error instanceof Error ? error.message : 'Failed to generate upload URL';
      res.status(500).json({ error: message });
    }
  },

  // Create file record after successful S3 upload
  async createFileRecord(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const validatedData = createFileRequestSchema.parse(req.body);
      const userId = req.user.id.toString();

      // Generate the S3 URL
      const bucketName = process.env.AWS_S3_BUCKET || 'satya-coaching-files';
      const region = process.env.AWS_REGION || 'us-east-1';
      const s3Url = `https://${bucketName}.s3.${region}.amazonaws.com/${validatedData.s3Key}`;

      const fileRecord = await createFileRecord(userId, {
        url: s3Url,
        filename: validatedData.filename,
        mimetype: validatedData.mimeType,
        size: validatedData.size,
        context: validatedData.context || 'audio_note',
      });

      // Return the response expected by the frontend
      res.status(201).json({
        fileId: fileRecord._id.toString(),
        s3Key: validatedData.s3Key,
        url: s3Url,
        size: validatedData.size,
        duration: validatedData.duration,
        mimeType: validatedData.mimeType,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: error.errors 
        });
      }

      console.error('Error creating file record:', error);
      res.status(500).json({ error: 'Failed to create file record' });
    }
  },

  // Get audio file information
  async getAudioFile(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const fileId = req.params.fileId;
      const userId = req.user.id.toString();

      const file = await getFileById(fileId, userId);

      if (!file) {
        return res.status(404).json({ error: 'Audio file not found' });
      }

      // Only return audio files
      if (!file.mimetype.startsWith('audio/')) {
        return res.status(400).json({ error: 'File is not an audio file' });
      }

      res.json({
        fileId: file._id.toString(),
        url: file.url,
        filename: file.filename,
        mimeType: file.mimetype,
        size: file.size,
        context: file.context,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
      });
    } catch (error) {
      console.error('Error getting audio file:', error);
      res.status(500).json({ error: 'Failed to get audio file' });
    }
  },

  // Delete audio file
  async deleteAudioFile(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const fileId = req.params.fileId;
      const userId = req.user.id.toString();

      // Get file info first to verify it exists and is owned by user
      const file = await getFileById(fileId, userId);

      if (!file) {
        return res.status(404).json({ error: 'Audio file not found' });
      }

      // Only allow deletion of audio files
      if (!file.mimetype.startsWith('audio/')) {
        return res.status(400).json({ error: 'File is not an audio file' });
      }

      // Delete the file record (the fileController handles S3 deletion)
      const deleted = await deleteFileRecord(fileId, userId);

      if (!deleted) {
        return res.status(500).json({ error: 'Failed to delete file record' });
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting audio file:', error);
      res.status(500).json({ error: 'Failed to delete audio file' });
    }
  },

  // Get user's audio files with pagination
  async getUserAudioFiles(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
      const context = req.query.context as string;

      // This would need to be implemented in storage.ts
      // For now, return a placeholder response
      res.json({
        files: [],
        pagination: {
          total: 0,
          page,
          limit,
          pages: 0,
        },
      });
    } catch (error) {
      console.error('Error getting user audio files:', error);
      res.status(500).json({ error: 'Failed to get audio files' });
    }
  },
}; 