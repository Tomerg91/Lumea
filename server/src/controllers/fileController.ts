import { Request, Response } from 'express';
import { z } from 'zod';
import { supabaseFileStorage } from '../lib/supabaseFileStorage';
import { supabaseStorage } from '../lib/supabaseStorage';
import { validate as uuidValidate } from 'uuid';

// Validation schemas
const fileContextSchema = z.object({
  context: z.enum(['profile', 'resource', 'audio_note']).optional(),
});

export const fileController = {
  // Upload a single file
  async uploadFile(req: Request, res: Response) {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const validatedData = fileContextSchema.parse(req.body);
      const context = validatedData.context || 'resource';

      // Upload to Supabase Storage
      const uploadResult = await supabaseFileStorage.uploadFileByContext(
        file.buffer,
        file.originalname,
        context,
        String(req.user.id),
        {
          contentType: file.mimetype,
        }
      );

      // Create file record in database
      const fileRecord = await supabaseStorage.createFileRecord(String(req.user.id), {
        url: uploadResult.url,
        filename: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        context: context,
      });

      res.status(201).json({
        id: fileRecord.id,
        filename: fileRecord.filename,
        originalName: fileRecord.filename,
        mimetype: fileRecord.mimetype,
        size: fileRecord.size,
        url: fileRecord.url,
        context: fileRecord.context,
        uploadedAt: fileRecord.createdAt,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error('Error uploading file:', error);
        res.status(500).json({ error: 'Failed to upload file' });
      }
    }
  },

  // Upload multiple files
  async uploadMultipleFiles(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      if (!req.files || !Array.isArray(req.files)) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      const validatedData = fileContextSchema.parse(req.body);
      const context = validatedData.context || 'resource';

      const fileRecords = await Promise.all(
        req.files.map(async (file) => {
          // Upload to Supabase Storage
          const uploadResult = await supabaseFileStorage.uploadFileByContext(
            file.buffer,
            file.originalname,
            context,
            String(req.user.id),
            {
              contentType: file.mimetype,
            }
          );

          // Create file record in database
          return await supabaseStorage.createFileRecord(String(req.user.id), {
            url: uploadResult.url,
            filename: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            context: context,
          });
        })
      );

      const formattedRecords = fileRecords.map(record => ({
        id: record.id,
        filename: record.filename,
        originalName: record.filename,
        mimetype: record.mimetype,
        size: record.size,
        url: record.url,
        context: record.context,
        uploadedAt: record.createdAt,
      }));

      res.status(201).json(formattedRecords);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error('Error uploading files:', error);
        res.status(500).json({ error: 'Failed to upload files' });
      }
    }
  },

  // Get a file by ID
  async getFile(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const fileId = req.params.id;
      if (!uuidValidate(fileId)) {
        return res.status(400).json({ error: 'Invalid file ID format' });
      }

      const file = await supabaseStorage.getFileById(fileId, String(req.user.id));

      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }

      res.json({
        id: file.id,
        filename: file.filename,
        originalName: file.filename,
        mimetype: file.mimetype,
        size: file.size,
        url: file.url,
        context: file.context,
        uploadedAt: file.createdAt,
      });
    } catch (error) {
      console.error('Error getting file:', error);
      res.status(500).json({ error: 'Failed to get file' });
    }
  },

  // Get files by context
  async getFilesByContext(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const validatedData = fileContextSchema.parse(req.query);

      if (!validatedData.context) {
        return res.status(400).json({ error: 'Context is required' });
      }

      const files = await supabaseStorage.getFilesByUserAndContext(String(req.user.id), validatedData.context);

      const formattedFiles = files.map(file => ({
        id: file.id,
        filename: file.filename,
        originalName: file.filename,
        mimetype: file.mimetype,
        size: file.size,
        url: file.url,
        context: file.context,
        uploadedAt: file.createdAt,
      }));

      res.json(formattedFiles);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error('Error getting files by context:', error);
        res.status(500).json({ error: 'Failed to get files by context' });
      }
    }
  },

  // Delete a file
  async deleteFile(req: Request, res: Response) {
    try {
      const fileId = req.params.id;

      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      if (!uuidValidate(fileId)) {
        return res.status(400).json({ error: 'Invalid file ID format' });
      }

      const file = await supabaseStorage.getFileById(fileId, String(req.user.id));

      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }

      // Delete from Supabase Storage
      // Extract bucket from context and try to delete from storage
      const bucketMap = {
        profile: 'profiles',
        resource: 'resources',
        audio_note: 'audio-notes',
      };
      
      const bucket = bucketMap[file.context];
      
      // Try to extract path from URL or use a constructed path
      let storagePath = '';
      if (file.url.includes('supabase')) {
        // Extract path from Supabase URL
        const urlParts = file.url.split('/');
        storagePath = urlParts.slice(-2).join('/'); // Get last two parts (userId/filename)
      } else {
        // Construct path based on our upload pattern
        storagePath = `${file.userId}/${file.context}/${file.filename}`;
      }
      
      if (storagePath) {
        const deleted = await supabaseFileStorage.deleteFile(bucket, storagePath);
        if (!deleted) {
          console.warn(`Failed to delete file from storage: ${storagePath}`);
        }
      }

      // Delete from database
      const deletedRecord = await supabaseStorage.deleteFileRecord(fileId, String(req.user.id));

      if (!deletedRecord) {
        return res.status(500).json({ error: 'Failed to delete file record' });
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting file:', error);
      res.status(500).json({ error: 'Failed to delete file' });
    }
  },

  // Download a file
  async downloadFile(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const fileId = req.params.id;
      if (!uuidValidate(fileId)) {
        return res.status(400).json({ error: 'Invalid file ID format' });
      }

      const file = await supabaseStorage.getFileById(fileId, String(req.user.id));

      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }

      // Get file from Supabase Storage
      const bucketMap = {
        profile: 'profiles',
        resource: 'resources',
        audio_note: 'audio-notes',
      };
      
      const bucket = bucketMap[file.context];
      
      // Try to extract path from URL or use a constructed path
      let storagePath = '';
      if (file.url.includes('supabase')) {
        // Extract path from Supabase URL
        const urlParts = file.url.split('/');
        storagePath = urlParts.slice(-2).join('/'); // Get last two parts (userId/filename)
      } else {
        // Construct path based on our upload pattern
        storagePath = `${file.userId}/${file.context}/${file.filename}`;
      }
      
      if (storagePath) {
        const downloadResult = await supabaseFileStorage.downloadFile(bucket, storagePath);
        
        if (downloadResult.error) {
          return res.status(500).json({ error: 'Failed to download file' });
        }

        // Set appropriate headers
        res.setHeader('Content-Type', file.mimetype);
        res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
        res.setHeader('Content-Length', file.size.toString());

        // Convert Blob to Buffer and send
        const buffer = Buffer.from(await downloadResult.data.arrayBuffer());
        res.send(buffer);
      } else {
        // Fallback to public URL redirect
        res.redirect(file.url);
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      res.status(500).json({ error: 'Failed to download file' });
    }
  },
};
