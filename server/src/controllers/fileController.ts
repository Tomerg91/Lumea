import { Request, Response } from 'express';
import { z } from 'zod';
import { File } from '../models/File.js';
import { createFileRecord, getFileById, getFilesByUserAndContext, deleteFileRecord } from '../storage.js';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { S3Client } from '@aws-sdk/client-s3';
import mongoose from 'mongoose';

// Initialize S3 client if AWS credentials are provided
const s3Client = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
  ? new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    })
  : null;

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

      // Check user *before* using req.user
      if (!req.user) { 
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const validatedData = fileContextSchema.parse(req.body);

      let fileUrl: string;

      if (s3Client) {
        // Use req.user.id
        const key = `files/${req.user.id}/${Date.now()}-${file.originalname}`; 
        await s3Client.send(new PutObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET || 'satya-coaching-files',
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        }));
        fileUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
      } else {
        // Store locally
        fileUrl = `/uploads/${file.filename}`;
      }

      // Use req.user.id
      const fileRecord = await createFileRecord(req.user.id.toString(), { 
        url: fileUrl,
        filename: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        context: validatedData.context,
      });

      res.status(201).json(fileRecord);
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

      const fileRecords = await Promise.all(
        req.files.map(async (file) => {
          let fileUrl: string;
          if (s3Client) {
            // Use req.user!.id with non-null assertion
            const key = `files/${req.user!.id}/${Date.now()}-${file.originalname}`; 
            await s3Client.send(new PutObjectCommand({
              Bucket: process.env.AWS_S3_BUCKET || 'satya-coaching-files',
              Key: key,
              Body: file.buffer,
              ContentType: file.mimetype,
            }));
            fileUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
          } else {
            fileUrl = `/uploads/${file.filename}`;
          }

          // Use req.user!.id with non-null assertion
          return createFileRecord(req.user!.id.toString(), { 
            url: fileUrl,
            filename: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            context: validatedData.context,
          });
        })
      );

      res.status(201).json(fileRecords);
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

      // Use req.user.id
      const file = await getFileById(req.params.id, req.user.id.toString()); 
      
      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }

      res.json(file);
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

      // Use req.user.id
      const files = await getFilesByUserAndContext( 
        req.user.id.toString(),
        validatedData.context
      );

      res.json(files);
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

      // Check user *before* using req.user
      if (!req.user) { 
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Use req.user.id
      const file = await getFileById(fileId, req.user.id.toString()); 

      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }

      // Delete from S3 if applicable (using file.url or stored key)
      if (s3Client && file.url.includes('amazonaws.com')) {
        const key = file.url.split('.com/')[1]; // Extract key from URL
        try {
          await s3Client.send(new DeleteObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET || 'satya-coaching-files',
            Key: key,
          }));
        } catch (s3Error) {
          console.error('Failed to delete file from S3:', s3Error);
          // Decide if we should still proceed with DB deletion
        }
      }

      // Use req.user.id
      const deleted = await deleteFileRecord(fileId, req.user.id.toString()); 

      // Check if deletion from DB was successful (redundant if findById was sufficient)
      if (!deleted) { 
        // This might indicate a race condition or logic error if getFileById succeeded
        console.warn(`File ${fileId} found but failed to delete from DB.`);
        // Return error or success based on policy
        return res.status(500).json({ error: 'Failed to delete file record' });
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting file:', error);
      res.status(500).json({ error: 'Failed to delete file' });
    }
  },
}; 