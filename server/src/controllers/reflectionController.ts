import { Request, Response } from 'express';
import { z } from 'zod';
import { IReflection, Reflection } from '../models/Reflection.js';
import { Session } from '../models/Session.js';
import { File } from '../models/File.js';
import mongoose from 'mongoose';

// Validation schemas
const createReflectionSchema = z.object({
  sessionId: z.string(),
  textContent: z.string(),
  audioFileId: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const updateReflectionSchema = createReflectionSchema.partial();

export const reflectionController = {
  // Create a new reflection
  async createReflection(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const validatedData = createReflectionSchema.parse(req.body);

      // Check if session exists and user has access
      const session = await Session.findById(validatedData.sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      if (session.clientId.toString() !== req.user.id.toString()) {
        return res
          .status(403)
          .json({ error: 'Not authorized to create reflection for this session' });
      }

      // If audio file is provided, verify it exists and belongs to the user
      if (validatedData.audioFileId) {
        const audioFile = await File.findById(validatedData.audioFileId);
        if (!audioFile || audioFile.userId.toString() !== req.user.id.toString()) {
          return res.status(400).json({ error: 'Invalid audio file' });
        }
      }

      const reflection = new Reflection({
        ...validatedData,
        userId: req.user.id,
        sessionId: new mongoose.Types.ObjectId(validatedData.sessionId),
        audioFileId: validatedData.audioFileId
          ? new mongoose.Types.ObjectId(validatedData.audioFileId)
          : undefined,
        tags: validatedData.tags
          ? validatedData.tags.map((id) => new mongoose.Types.ObjectId(id))
          : undefined,
      });

      await reflection.save();
      res.status(201).json(reflection);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error('Error creating reflection:', error);
        res.status(500).json({ error: 'Failed to create reflection' });
      }
    }
  },

  // Get a reflection by ID
  async getReflection(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const reflection = await Reflection.findById(req.params.id)
        .populate('sessionId')
        .populate('audioFileId')
        .populate('tags');

      if (!reflection) {
        return res.status(404).json({ error: 'Reflection not found' });
      }

      // Check if user has access to this reflection
      const session = await Session.findById(reflection.sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Associated session not found' });
      }

      if (req.user.role === 'client' && reflection.userId.toString() !== req.user.id.toString()) {
        return res.status(403).json({ error: 'Not authorized to view this reflection' });
      }

      if (req.user.role === 'coach' && session.coachId.toString() !== req.user.id.toString()) {
        return res.status(403).json({ error: 'Not authorized to view this reflection' });
      }

      // Decrypt the text content if it's encrypted
      if (reflection.isEncrypted) {
        const decryptedReflection = reflection.toObject();
        decryptedReflection.textContent = (
          reflection as unknown as { decryptText(): string }
        ).decryptText();
        res.json(decryptedReflection);
      } else {
        res.json(reflection);
      }
    } catch (error) {
      console.error('Error getting reflection:', error);
      res.status(500).json({ error: 'Failed to get reflection' });
    }
  },

  // Get all reflections for a session
  async getSessionReflections(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const session = await Session.findById(req.params.sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Check if user has access to this session
      if (req.user.role === 'client' && session.clientId.toString() !== req.user.id.toString()) {
        return res
          .status(403)
          .json({ error: 'Not authorized to view reflections for this session' });
      }

      if (req.user.role === 'coach' && session.coachId.toString() !== req.user.id.toString()) {
        return res
          .status(403)
          .json({ error: 'Not authorized to view reflections for this session' });
      }

      const reflections = await Reflection.find({ sessionId: req.params.sessionId })
        .populate('audioFileId')
        .populate('tags');

      // Decrypt all reflections if they're encrypted
      const decryptedReflections = reflections.map((reflection) => {
        const decryptedReflection = reflection.toObject();
        if (reflection.isEncrypted) {
          decryptedReflection.textContent = (
            reflection as unknown as { decryptText(): string }
          ).decryptText();
        }
        return decryptedReflection;
      });

      res.json(decryptedReflections);
    } catch (error) {
      console.error('Error getting session reflections:', error);
      res.status(500).json({ error: 'Failed to get session reflections' });
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

      // Check if user is authorized to update this reflection
      if (reflection.userId.toString() !== req.user.id.toString()) {
        return res.status(403).json({ error: 'Not authorized to update this reflection' });
      }

      const validatedData = updateReflectionSchema.parse(req.body);

      // If session ID is being updated, check if the new session exists and user has access
      if (validatedData.sessionId) {
        const session = await Session.findById(validatedData.sessionId);
        if (!session) {
          return res.status(404).json({ error: 'Session not found' });
        }

        if (session.clientId.toString() !== req.user.id.toString()) {
          return res
            .status(403)
            .json({ error: 'Not authorized to update reflection for this session' });
        }
      }

      // If audio file is being updated, verify it exists and belongs to the user
      if (validatedData.audioFileId) {
        const audioFile = await File.findById(validatedData.audioFileId);
        if (!audioFile || audioFile.userId.toString() !== req.user.id.toString()) {
          return res.status(400).json({ error: 'Invalid audio file' });
        }
      }

      // Update the reflection
      const updateData: Record<string, unknown> = { ...validatedData };

      if (validatedData.sessionId) {
        updateData.sessionId = new mongoose.Types.ObjectId(validatedData.sessionId);
      }

      if (validatedData.audioFileId) {
        updateData.audioFileId = new mongoose.Types.ObjectId(validatedData.audioFileId);
      }

      if (validatedData.tags) {
        updateData.tags = validatedData.tags.map((id) => new mongoose.Types.ObjectId(id));
      }

      const updatedReflection = await Reflection.findByIdAndUpdate(req.params.id, updateData, {
        new: true,
      })
        .populate('audioFileId')
        .populate('tags');

      if (!updatedReflection) {
        return res.status(404).json({ error: 'Reflection not found' });
      }

      // Decrypt the text content if it's encrypted
      if (updatedReflection.isEncrypted) {
        const decryptedReflection = updatedReflection.toObject();
        decryptedReflection.textContent = (
          updatedReflection as unknown as { decryptText(): string }
        ).decryptText();
        res.json(decryptedReflection);
      } else {
        res.json(updatedReflection);
      }
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

      // Check if user is authorized to delete this reflection
      if (reflection.userId.toString() !== req.user.id.toString()) {
        return res.status(403).json({ error: 'Not authorized to delete this reflection' });
      }

      await Reflection.findByIdAndDelete(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting reflection:', error);
      res.status(500).json({ error: 'Failed to delete reflection' });
    }
  },

  // Share reflection with coach
  async shareWithCoach(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const reflection = await Reflection.findById(req.params.id);
      if (!reflection) {
        return res.status(404).json({ error: 'Reflection not found' });
      }

      // Check if user is authorized to share this reflection
      if (reflection.userId.toString() !== req.user.id.toString()) {
        return res.status(403).json({ error: 'Not authorized to share this reflection' });
      }

      // Get the session to find the coach
      const session = await Session.findById(reflection.sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Associated session not found' });
      }

      // In a real implementation, you might want to notify the coach or update a status
      // For now, we'll just return success
      res.json({ message: 'Reflection shared with coach successfully' });
    } catch (error) {
      console.error('Error sharing reflection with coach:', error);
      res.status(500).json({ error: 'Failed to share reflection with coach' });
    }
  },
};
