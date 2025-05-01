import { Request, Response } from 'express';
import { z } from 'zod';
import {
  createTag,
  updateTag,
  getTagById,
  getTagsByUser,
  deleteTag,
  createTagSchema,
  updateTagSchema,
} from '../storage.js';

export const tagController = {
  // Create a new tag
  async createTag(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const validatedData = createTagSchema.parse(req.body);
      const tag = await createTag(validatedData, req.user.id.toString());
      res.status(201).json(tag);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error('Error creating tag:', error);
        res.status(500).json({ error: 'Failed to create tag' });
      }
    }
  },

  // Get a tag by ID
  async getTag(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const tag = await getTagById(req.params.id);

      if (!tag) {
        return res.status(404).json({ error: 'Tag not found' });
      }

      // Check if user is authorized to view this tag
      if (tag.createdBy.toString() !== req.user.id.toString()) {
        return res.status(403).json({ error: 'Not authorized to view this tag' });
      }

      res.json(tag);
    } catch (error) {
      console.error('Error getting tag:', error);
      res.status(500).json({ error: 'Failed to get tag' });
    }
  },

  // Get all tags for the current user
  async getUserTags(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const tags = await getTagsByUser(req.user.id.toString());
      res.json(tags);
    } catch (error) {
      console.error('Error getting user tags:', error);
      res.status(500).json({ error: 'Failed to get tags' });
    }
  },

  // Update a tag
  async updateTag(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const tag = await getTagById(req.params.id);

      if (!tag) {
        return res.status(404).json({ error: 'Tag not found' });
      }

      // Check if user is authorized to update this tag
      if (tag.createdBy.toString() !== req.user.id.toString()) {
        return res.status(403).json({ error: 'Not authorized to update this tag' });
      }

      const validatedData = updateTagSchema.parse(req.body);
      const updatedTag = await updateTag(req.params.id, validatedData);

      if (!updatedTag) {
        return res.status(404).json({ error: 'Tag not found' });
      }

      res.json(updatedTag);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error('Error updating tag:', error);
        res.status(500).json({ error: 'Failed to update tag' });
      }
    }
  },

  // Delete a tag
  async deleteTag(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const tag = await getTagById(req.params.id);

      if (!tag) {
        return res.status(404).json({ error: 'Tag not found' });
      }

      // Check if user is authorized to delete this tag
      if (tag.createdBy.toString() !== req.user.id.toString()) {
        return res.status(403).json({ error: 'Not authorized to delete this tag' });
      }

      await deleteTag(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting tag:', error);
      res.status(500).json({ error: 'Failed to delete tag' });
    }
  },
};
