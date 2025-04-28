import { Request, Response } from 'express';
import { Resource } from '../models/Resource.js';
import { User, IUser } from '../models/User.js';
import mongoose from 'mongoose';

export const resourceController = {
  // Create a new resource
  async createResource(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { title, description, fileId, tags } = req.body;

      const resource = await Resource.create({
        title,
        description,
        fileId,
        coachId: req.user.id,
        tags,
        assignedClientIds: [],
      });

      res.status(201).json(resource);
    } catch (error) {
      console.error('Error creating resource:', error);
      res.status(500).json({ error: 'Failed to create resource' });
    }
  },

  // Get all resources
  async getResources(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      let query: any = {};
      
      if (req.user.role === 'coach') {
        query.coachId = req.user.id;
      }
      else if (req.user.role === 'client') {
        query.assignedClientIds = req.user.id;
      }

      const resources = await Resource.find(query)
        .populate('fileId')
        .populate('tags')
        .sort({ createdAt: -1 });

      res.json(resources);
    } catch (error) {
      console.error('Error getting resources:', error);
      res.status(500).json({ error: 'Failed to get resources' });
    }
  },

  // Get a specific resource
  async getResource(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const resource = await Resource.findById(req.params.id)
        .populate('fileId')
        .populate('tags');

      if (!resource) {
        return res.status(404).json({ error: 'Resource not found' });
      }

      if (
        req.user.role === 'coach' && 
        resource.coachId.toString() !== req.user.id.toString()
      ) {
        return res.status(403).json({ error: 'Not authorized to view this resource' });
      }

      if (
        req.user.role === 'client' && 
        !resource.assignedClientIds.map(id => id.toString()).includes(req.user.id)
      ) {
        return res.status(403).json({ error: 'Not authorized to view this resource' });
      }

      res.json(resource);
    } catch (error) {
      console.error('Error getting resource:', error);
      res.status(500).json({ error: 'Failed to get resource' });
    }
  },

  // Update a resource
  async updateResource(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const resource = await Resource.findById(req.params.id);

      if (!resource) {
        return res.status(404).json({ error: 'Resource not found' });
      }

      if (resource.coachId.toString() !== req.user.id.toString()) {
        return res.status(403).json({ error: 'Not authorized to update this resource' });
      }

      const { title, description, fileId, tags } = req.body;

      const updatedResource = await Resource.findByIdAndUpdate(
        req.params.id,
        {
          title,
          description,
          fileId,
          tags,
        },
        { new: true }
      ).populate('fileId').populate('tags');

      res.json(updatedResource);
    } catch (error) {
      console.error('Error updating resource:', error);
      res.status(500).json({ error: 'Failed to update resource' });
    }
  },

  // Delete a resource
  async deleteResource(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const resource = await Resource.findById(req.params.id);

      if (!resource) {
        return res.status(404).json({ error: 'Resource not found' });
      }

      if (resource.coachId.toString() !== req.user.id.toString()) {
        return res.status(403).json({ error: 'Not authorized to delete this resource' });
      }

      await Resource.findByIdAndDelete(req.params.id);

      res.json({ message: 'Resource deleted successfully' });
    } catch (error) {
      console.error('Error deleting resource:', error);
      res.status(500).json({ error: 'Failed to delete resource' });
    }
  },

  // Assign resource to clients
  async assignResource(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const resource = await Resource.findById(req.params.id);

      if (!resource) {
        return res.status(404).json({ error: 'Resource not found' });
      }

      if (resource.coachId.toString() !== req.user.id.toString()) {
        return res.status(403).json({ error: 'Not authorized to assign this resource' });
      }

      const { clientIds } = req.body;

      if (!Array.isArray(clientIds) || !clientIds.every(id => mongoose.Types.ObjectId.isValid(id))) {
        return res.status(400).json({ error: 'Invalid client IDs provided' });
      }

      const clients = await User.find({
        _id: { $in: clientIds },
        role: 'client'
      });

      if (clients.length !== clientIds.length) {
        return res.status(400).json({ error: 'One or more client IDs are invalid or not clients' });
      }

      const updatedResource = await Resource.findByIdAndUpdate(
        req.params.id,
        { assignedClientIds: clientIds },
        { new: true }
      ).populate('fileId').populate('tags');

      res.json(updatedResource);
    } catch (error) {
      console.error('Error assigning resource:', error);
      res.status(500).json({ error: 'Failed to assign resource' });
    }
  },
}; 