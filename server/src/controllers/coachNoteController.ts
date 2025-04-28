import { Request, Response } from 'express';
import { z } from 'zod';
import {
  createCoachNote,
  updateCoachNote,
  getCoachNoteById,
  getCoachNotesBySession,
  getCoachNotesByCoach,
  deleteCoachNote,
  createCoachNoteSchema,
  updateCoachNoteSchema,
} from '../storage.js';
import { Session } from '../models/Session.js';
import { ICoachNote } from '../models/CoachNote.js';

export const coachNoteController = {
  // Create a new coach note
  async createCoachNote(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      if (req.user.role !== 'coach') {
        return res.status(403).json({ error: 'Only coaches can create notes' });
      }

      const validatedData = createCoachNoteSchema.parse(req.body);

      // Check if session exists and belongs to the coach
      const session = await Session.findById(validatedData.sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      if (session.coachId.toString() !== req.user.id.toString()) {
        return res.status(403).json({ error: 'Not authorized to create notes for this session' });
      }

      const coachNote = await createCoachNote(validatedData, req.user.id.toString());
      res.status(201).json(coachNote);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error('Error creating coach note:', error);
        res.status(500).json({ error: 'Failed to create coach note' });
      }
    }
  },

  // Get a coach note by ID
  async getCoachNote(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const coachNote = await getCoachNoteById(req.params.id);
      
      if (!coachNote) {
        return res.status(404).json({ error: 'Coach note not found' });
      }

      // Check if user is authorized to view this note
      if (coachNote.coachId.toString() !== req.user.id.toString()) {
        return res.status(403).json({ error: 'Not authorized to view this note' });
      }

      // Decrypt the text content if it's encrypted
      if (coachNote.isEncrypted) {
        const decryptedNote = coachNote.toObject();
        decryptedNote.textContent = (coachNote as any).decryptText();
        res.json(decryptedNote);
      } else {
        res.json(coachNote);
      }
    } catch (error) {
      console.error('Error getting coach note:', error);
      res.status(500).json({ error: 'Failed to get coach note' });
    }
  },

  // Get all coach notes for a session
  async getSessionCoachNotes(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const session = await Session.findById(req.params.sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Check if user is authorized to view notes for this session
      if (session.coachId.toString() !== req.user.id.toString()) {
        return res.status(403).json({ error: 'Not authorized to view notes for this session' });
      }

      const notes = await getCoachNotesBySession(req.params.sessionId);
      
      // Decrypt all notes if they're encrypted
      const decryptedNotes = notes.map(note => {
        const decryptedNote = note.toObject();
        if (note.isEncrypted) {
          decryptedNote.textContent = (note as any).decryptText();
        }
        return decryptedNote;
      });

      res.json(decryptedNotes);
    } catch (error) {
      console.error('Error getting session coach notes:', error);
      res.status(500).json({ error: 'Failed to get coach notes' });
    }
  },

  // Get all coach notes for the current coach
  async getCoachNotes(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      if (req.user.role !== 'coach') {
        return res.status(403).json({ error: 'Only coaches can view notes' });
      }

      const notes = await getCoachNotesByCoach(req.user.id.toString());
      
      // Decrypt all notes if they're encrypted
      const decryptedNotes = notes.map(note => {
        const decryptedNote = note.toObject();
        if (note.isEncrypted) {
          decryptedNote.textContent = (note as any).decryptText();
        }
        return decryptedNote;
      });

      res.json(decryptedNotes);
    } catch (error) {
      console.error('Error getting coach notes:', error);
      res.status(500).json({ error: 'Failed to get coach notes' });
    }
  },

  // Update a coach note
  async updateCoachNote(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const coachNote = await getCoachNoteById(req.params.id);
      
      if (!coachNote) {
        return res.status(404).json({ error: 'Coach note not found' });
      }

      // Check if user is authorized to update this note
      if (coachNote.coachId.toString() !== req.user.id.toString()) {
        return res.status(403).json({ error: 'Not authorized to update this note' });
      }

      const validatedData = updateCoachNoteSchema.parse(req.body);
      const updatedNote = await updateCoachNote(req.params.id, validatedData);
      
      if (!updatedNote) {
        return res.status(404).json({ error: 'Coach note not found' });
      }

      // Decrypt the text content if it's encrypted
      if (updatedNote.isEncrypted) {
        const decryptedNote = updatedNote.toObject();
        decryptedNote.textContent = (updatedNote as any).decryptText();
        res.json(decryptedNote);
      } else {
        res.json(updatedNote);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error('Error updating coach note:', error);
        res.status(500).json({ error: 'Failed to update coach note' });
      }
    }
  },

  // Delete a coach note
  async deleteCoachNote(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const coachNote = await getCoachNoteById(req.params.id);
      
      if (!coachNote) {
        return res.status(404).json({ error: 'Coach note not found' });
      }

      // Check if user is authorized to delete this note
      if (coachNote.coachId.toString() !== req.user.id.toString()) {
        return res.status(403).json({ error: 'Not authorized to delete this note' });
      }

      await deleteCoachNote(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting coach note:', error);
      res.status(500).json({ error: 'Failed to delete coach note' });
    }
  },
}; 