import { Request, Response } from 'express';
import { z } from 'zod';
import { supabaseFileStorage } from '../lib/supabaseFileStorage';
import { supabase, serverTables } from '../lib/supabase';
import { validate as uuidValidate } from 'uuid';
import type { File } from '../../../shared/types/database';

// Validation schemas
const presignedUrlRequestSchema = z.object({
  mimeType: z.string().refine(
    (type) => type.startsWith('audio/'),
    'MIME type must be an audio format'
  ),
  fileSize: z.number().min(1).max(20 * 1024 * 1024), // Max 20MB
  filename: z.string().min(1, 'Filename is required'),
});

const createFileRequestSchema = z.object({
  filename: z.string().min(1, 'Filename is required'),
  mimeType: z.string().refine(
    (type) => type.startsWith('audio/'),
    'MIME type must be an audio format'
  ),
  size: z.number().min(1),
  duration: z.number().min(0).optional(),
  context: z.enum(['audio_note']).optional().default('audio_note'),
});

// Validation schema for query parameters
const getUserAudioFilesSchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(50).optional().default(10),
  context: z.enum(['audio_note']).optional(),
});

export const audioController = {
  // Get presigned URL for uploading audio files
  async getPresignedUploadUrl(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const validatedData = presignedUrlRequestSchema.parse(req.body);
      const { mimeType, fileSize, filename } = validatedData;

      // Generate presigned URL for Supabase Storage
      const storagePath = `${String(req.user.id)}/audio_note/${filename}`;
      const presignedUrl = await supabaseFileStorage.createSignedUrl(
        'audio-notes',
        storagePath,
        3600
      );

      if (!presignedUrl) {
        return res.status(500).json({ error: 'Failed to generate presigned URL' });
      }

      res.json({
        presignedUrl,
        storagePath,
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
      res.status(500).json({ error: 'Failed to generate presigned URL' });
    }
  },

  // Create file record after successful upload
  async createFileRecord(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const validatedData = createFileRequestSchema.parse(req.body);

      // Get public URL for the file
      const storagePath = `${req.user.id}/${validatedData.context}/${validatedData.filename}`;
      const fileUrl = supabaseFileStorage.getPublicUrl('audio-notes', storagePath);

      // Create file record in database
      const { data: fileRecord, error: dbError } = await serverTables.files()
        .insert({
          user_id: String(req.user.id), // Convert to string
          filename: validatedData.filename,
          mimetype: validatedData.mimeType,
          size: validatedData.size,
          url: fileUrl,
          context: validatedData.context,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (dbError || !fileRecord) {
        console.error('Error creating file record:', dbError);
        return res.status(500).json({ error: 'Failed to create file record' });
      }

      res.status(201).json({
        fileId: fileRecord.id,
        url: fileRecord.url,
        filename: fileRecord.filename,
        mimeType: fileRecord.mimetype,
        size: fileRecord.size,
        duration: validatedData.duration,
        context: fileRecord.context,
        uploadedAt: fileRecord.created_at,
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

  // Upload audio file directly to Supabase Storage
  async uploadAudio(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: 'No audio file uploaded' });
      }

      // Validate file type
      if (!file.mimetype.startsWith('audio/')) {
        return res.status(400).json({ error: 'File must be an audio format' });
      }

      const validatedData = createFileRequestSchema.parse({
        filename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        context: req.body.context || 'audio_note',
        duration: req.body.duration ? parseFloat(req.body.duration) : undefined,
      });

      // Upload to Supabase Storage in audio-notes bucket
      const uploadResult = await supabaseFileStorage.uploadFileByContext(
        file.buffer,
        validatedData.filename,
        'audio_note',
        String(req.user.id),
        {
          contentType: validatedData.mimeType,
        }
      );

      // Create file record in database
      const { data: fileRecord, error: dbError } = await serverTables.files()
        .insert({
          user_id: String(req.user.id),
          filename: validatedData.filename,
          mimetype: validatedData.mimeType,
          size: validatedData.size,
          url: uploadResult.url,
          context: validatedData.context,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (dbError || !fileRecord) {
        console.error('Error creating file record:', dbError);
        return res.status(500).json({ error: 'Failed to create file record' });
      }

      res.status(201).json({
        fileId: fileRecord.id,
        url: fileRecord.url,
        filename: fileRecord.filename,
        mimeType: fileRecord.mimetype,
        size: fileRecord.size,
        duration: validatedData.duration,
        context: fileRecord.context,
        uploadedAt: fileRecord.created_at,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: error.errors 
        });
      }

      console.error('Error uploading audio file:', error);
      res.status(500).json({ error: 'Failed to upload audio file' });
    }
  },

  // Get audio file information
  async getAudioFile(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const fileId = req.params.fileId;
      
      if (!uuidValidate(fileId)) {
        return res.status(400).json({ error: 'Invalid file ID format' });
      }

      const { data: file, error } = await serverTables.files()
        .select('*')
        .eq('id', fileId)
        .eq('user_id', req.user.id)
        .single();

      if (error || !file) {
        return res.status(404).json({ error: 'Audio file not found' });
      }

      // Only return audio files
      if (!file.mimetype.startsWith('audio/')) {
        return res.status(400).json({ error: 'File is not an audio file' });
      }

      res.json({
        fileId: file.id,
        url: file.url,
        filename: file.filename,
        mimeType: file.mimetype,
        size: file.size,
        context: file.context,
        createdAt: file.created_at,
        updatedAt: file.updated_at,
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
      
      if (!uuidValidate(fileId)) {
        return res.status(400).json({ error: 'Invalid file ID format' });
      }

      // Get file info first to verify it exists and is owned by user
      const { data: file, error: getError } = await serverTables.files()
        .select('*')
        .eq('id', fileId)
        .eq('user_id', req.user.id)
        .single();

      if (getError || !file) {
        return res.status(404).json({ error: 'Audio file not found' });
      }

      // Only allow deletion of audio files
      if (!file.mimetype.startsWith('audio/')) {
        return res.status(400).json({ error: 'File is not an audio file' });
      }

      // Delete from Supabase Storage
      const storagePath = `${file.user_id}/${file.context}/${file.filename}`;
      const storageDeleted = await supabaseFileStorage.deleteFile('audio-notes', storagePath);
      
      if (!storageDeleted) {
        console.warn(`Failed to delete file from storage: ${storagePath}`);
      }

      // Delete the file record from database
      const { error: deleteError } = await serverTables.files()
        .delete()
        .eq('id', fileId)
        .eq('user_id', req.user.id);

      if (deleteError) {
        console.error('Error deleting file record:', deleteError);
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

      const validatedQuery = getUserAudioFilesSchema.parse(req.query);
      const { page, limit, context } = validatedQuery;
      const offset = (page - 1) * limit;

      // Build query
      let query = serverTables.files()
        .select('*', { count: 'exact' })
        .eq('user_id', req.user.id)
        .like('mimetype', 'audio/%');

      if (context) {
        query = query.eq('context', context);
      }

      const { data: files, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error getting user audio files:', error);
        return res.status(500).json({ error: 'Failed to get audio files' });
      }

      const totalPages = count ? Math.ceil(count / limit) : 0;

      res.json({
        files: (files || []).map(file => ({
          fileId: file.id,
          url: file.url,
          filename: file.filename,
          mimeType: file.mimetype,
          size: file.size,
          context: file.context,
          createdAt: file.created_at,
          updatedAt: file.updated_at,
        })),
        pagination: {
          total: count || 0,
          page,
          limit,
          pages: totalPages,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: error.errors 
        });
      }

      console.error('Error getting user audio files:', error);
      res.status(500).json({ error: 'Failed to get audio files' });
    }
  },

  // Download audio file
  async downloadAudioFile(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const fileId = req.params.fileId;
      
      if (!uuidValidate(fileId)) {
        return res.status(400).json({ error: 'Invalid file ID format' });
      }

      const { data: file, error } = await serverTables.files()
        .select('*')
        .eq('id', fileId)
        .eq('user_id', req.user.id)
        .single();

      if (error || !file) {
        return res.status(404).json({ error: 'Audio file not found' });
      }

      // Only allow download of audio files
      if (!file.mimetype.startsWith('audio/')) {
        return res.status(400).json({ error: 'File is not an audio file' });
      }

      // Get file from Supabase Storage
      const storagePath = `${file.user_id}/${file.context}/${file.filename}`;
      const downloadResult = await supabaseFileStorage.downloadFile('audio-notes', storagePath);
      
      if (downloadResult.error) {
        // Fallback to public URL redirect
        return res.redirect(file.url);
      }

      // Set appropriate headers
      res.setHeader('Content-Type', file.mimetype);
      res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
      res.setHeader('Content-Length', file.size.toString());

      // Convert Blob to Buffer and send
      const buffer = Buffer.from(await downloadResult.data.arrayBuffer());
      res.send(buffer);
    } catch (error) {
      console.error('Error downloading audio file:', error);
      res.status(500).json({ error: 'Failed to download audio file' });
    }
  },
}; 