import { Request, Response } from 'express';
import { z } from 'zod';
import { IReflection, Reflection } from '../models/Reflection.js';
import mongoose from 'mongoose';
import { getPresignedAudioUploadUrl } from '../utils/s3/getPresignedUrl.js';
import { Session } from '../models/Session.js';

// Zod schema for creating a reflection
const createReflectionSchema = z.object({
  sessionId: z.string(),
  text: z.string().optional(),
  audio: z
    .object({
      mimeType: z.string(),
      size: z.number().int().positive(),
    })
    .optional(),
});

// Zod schema for updating a reflection
const updateReflectionSchema = z.object({
  text: z.string().optional(),
  audioUrl: z.string().optional(),
});

export const reflectionController = {
  // Create a new reflection
  async createReflection(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { sessionId, text, audio } = createReflectionSchema.parse(req.body);

      // Validate that at least one of text or audio is provided
      if (!text && !audio) {
        return res.status(400).json({ error: 'Either text or audio must be provided' });
      }

      // Find the session
      const session = await Session.findById(sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Check if the user is the client or coach of the session
      const isClient = session.clientId.toString() === req.user._id;
      const isCoach = session.coachId.toString() === req.user._id;

      if (!isClient && !isCoach) {
        return res.status(403).json({ error: 'Not authorized to create a reflection for this session' });
      }

      // Create the reflection without audioUrl
      const reflection = new Reflection({
        sessionId: new mongoose.Types.ObjectId(sessionId),
        clientId: session.clientId,
        coachId: session.coachId,
        text,
      });

      await reflection.save();

      // Generate presigned URL for audio upload if needed
      let presignedUrl;
      if (audio) {
        try {
          const { presignedUrl: url, objectKey } = await getPresignedAudioUploadUrl(
            req.user._id,
            audio.mimeType,
            audio.size
          );
          presignedUrl = url;

          // Update reflection with the S3 object key
          reflection.audioUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${objectKey}`;
          await reflection.save();
        } catch (error) {
          console.error('Error generating presigned URL:', error);
          // If there's an error with S3, we still want to return the created reflection
          return res.status(201).json({
            reflection,
            error: 'Failed to generate audio upload URL',
          });
        }
      }

      res.status(201).json({
        reflectionId: reflection._id,
        presignedUrl,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error('Error creating reflection:', error);
        res.status(500).json({ error: 'Failed to create reflection' });
      }
    }
  },

  // Get all reflections for a session
  async getSessionReflections(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const sessionId = req.params.sessionId;

      // Find the session to verify access
      const session = await Session.findById(sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Check if the user is the client or coach of the session
      const isClient = session.clientId.toString() === req.user._id;
      const isCoach = session.coachId.toString() === req.user._id;

      if (!isClient && !isCoach) {
        return res.status(403).json({ error: 'Not authorized to view reflections for this session' });
      }

      // Get reflections for the session
      const reflections = await Reflection.find({ sessionId: new mongoose.Types.ObjectId(sessionId) })
        .sort({ createdAt: -1 });

      res.json(reflections);
    } catch (error) {
      console.error('Error getting session reflections:', error);
      res.status(500).json({ error: 'Failed to get session reflections' });
    }
  },

  // Get all reflections
  async getReflections(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Query parameter for sessionId
      const sessionId = req.query.sessionId as string;

      // Base query
      let query: any = {};

      // If sessionId is provided, filter by it
      if (sessionId) {
        query.sessionId = new mongoose.Types.ObjectId(sessionId);

        // Verify session access
        const session = await Session.findById(sessionId);
        if (!session) {
          return res.status(404).json({ error: 'Session not found' });
        }

        // Check if the user is the client or coach of the session
        const isClient = session.clientId.toString() === req.user._id;
        const isCoach = session.coachId.toString() === req.user._id;

        if (!isClient && !isCoach) {
          return res.status(403).json({ error: 'Not authorized to view reflections for this session' });
        }
      } else {
        // If no sessionId, filter based on user role
        if (req.user.roleName === 'client') {
          // Clients can only see their own reflections
          query.clientId = new mongoose.Types.ObjectId(req.user._id);
        } else if (req.user.roleName === 'coach') {
          // Coaches can only see reflections for their clients
          query.coachId = new mongoose.Types.ObjectId(req.user._id);
        } else if (req.user.roleName !== 'admin') {
          return res.status(403).json({ error: 'Not authorized to view reflections' });
        }
      }

      // Get reflections based on query
      const reflections = await Reflection.find(query).sort({ createdAt: -1 });

      res.json(reflections);
    } catch (error) {
      console.error('Error getting reflections:', error);
      res.status(500).json({ error: 'Failed to get reflections' });
    }
  },

  // Get a specific reflection
  async getReflection(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const reflection = await Reflection.findById(req.params.id);

      if (!reflection) {
        return res.status(404).json({ error: 'Reflection not found' });
      }

      // Check if the user is the client or coach of the reflection
      const isClient = reflection.clientId.toString() === req.user._id;
      const isCoach = reflection.coachId.toString() === req.user._id;
      const isAdmin = req.user.roleName === 'admin';

      if (!isClient && !isCoach && !isAdmin) {
        return res.status(403).json({ error: 'Not authorized to view this reflection' });
      }

      res.json(reflection);
    } catch (error) {
      console.error('Error getting reflection:', error);
      res.status(500).json({ error: 'Failed to get reflection' });
    }
  },

  // Update a reflection
  async updateReflection(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const reflection = await Reflection.findById(req.params.id);
      if (!reflection) {
        return res.status(404).json({ error: 'Reflection not found' });
      }

      // Only the client or coach can update the reflection
      const isClient = reflection.clientId.toString() === req.user._id;
      const isCoach = reflection.coachId.toString() === req.user._id;

      if (!isClient && !isCoach) {
        return res.status(403).json({ error: 'Not authorized to update this reflection' });
      }

      const updateData = updateReflectionSchema.parse(req.body);

      // Update reflection
      const updatedReflection = await Reflection.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true }
      );

      res.json(updatedReflection);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error('Error updating reflection:', error);
        res.status(500).json({ error: 'Failed to update reflection' });
      }
    }
  },

  // Delete a reflection
  async deleteReflection(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const reflection = await Reflection.findById(req.params.id);
      if (!reflection) {
        return res.status(404).json({ error: 'Reflection not found' });
      }

      // Only the owner or an admin can delete
      const isClient = reflection.clientId.toString() === req.user._id;
      const isAdmin = req.user.roleName === 'admin';

      if (!isClient && !isAdmin) {
        return res.status(403).json({ error: 'Not authorized to delete this reflection' });
      }

      await Reflection.findByIdAndDelete(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting reflection:', error);
      res.status(500).json({ error: 'Failed to delete reflection' });
    }
  }
};
