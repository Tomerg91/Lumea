import { Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { validate as uuidValidate } from 'uuid';

export const resourceController = {
  // Create a new resource
  async createResource(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { title, description, fileId, tags } = req.body;

      const { data: resource, error } = await supabase
        .from('resources')
        .insert({
          title,
          description,
          file_id: fileId,
          coach_id: req.user.id,
          tags: tags || [],
          assigned_client_ids: [],
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating resource:', error);
        return res.status(500).json({ error: 'Failed to create resource' });
      }

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

      let query = supabase.from('resources').select('*');

      if (req.user.role === 'coach') {
        query = query.eq('coach_id', req.user.id);
      } else if (req.user.role === 'client') {
        query = query.contains('assigned_client_ids', [req.user.id]);
      }

      const { data: resources, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error getting resources:', error);
        return res.status(500).json({ error: 'Failed to get resources' });
      }

      res.json(resources || []);
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

      const { data: resource, error } = await supabase
        .from('resources')
        .select('*')
        .eq('id', req.params.id)
        .single();

      if (error || !resource) {
        return res.status(404).json({ error: 'Resource not found' });
      }

      // Check authorization
      if (req.user.role === 'coach' && resource.coach_id !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized to view this resource' });
      }

      if (
        req.user.role === 'client' &&
        !resource.assigned_client_ids?.includes(req.user.id)
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

      // First, check if resource exists and user has permission
      const { data: existingResource, error: fetchError } = await supabase
        .from('resources')
        .select('*')
        .eq('id', req.params.id)
        .single();

      if (fetchError || !existingResource) {
        return res.status(404).json({ error: 'Resource not found' });
      }

      if (existingResource.coach_id !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized to update this resource' });
      }

      const { title, description, fileId, tags } = req.body;

      const { data: updatedResource, error } = await supabase
        .from('resources')
        .update({
          title,
          description,
          file_id: fileId,
          tags: tags || [],
        })
        .eq('id', req.params.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating resource:', error);
        return res.status(500).json({ error: 'Failed to update resource' });
      }

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

      // First, check if resource exists and user has permission
      const { data: existingResource, error: fetchError } = await supabase
        .from('resources')
        .select('*')
        .eq('id', req.params.id)
        .single();

      if (fetchError || !existingResource) {
        return res.status(404).json({ error: 'Resource not found' });
      }

      if (existingResource.coach_id !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized to delete this resource' });
      }

      const { error } = await supabase
        .from('resources')
        .delete()
        .eq('id', req.params.id);

      if (error) {
        console.error('Error deleting resource:', error);
        return res.status(500).json({ error: 'Failed to delete resource' });
      }

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

      // First, check if resource exists and user has permission
      const { data: existingResource, error: fetchError } = await supabase
        .from('resources')
        .select('*')
        .eq('id', req.params.id)
        .single();

      if (fetchError || !existingResource) {
        return res.status(404).json({ error: 'Resource not found' });
      }

      if (existingResource.coach_id !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized to assign this resource' });
      }

      const { clientIds } = req.body;

      // Validate clientIds are valid UUIDs
      if (
        !Array.isArray(clientIds) ||
        !clientIds.every((id) => uuidValidate(id))
      ) {
        return res.status(400).json({ error: 'Invalid client IDs provided' });
      }

      // Verify all provided IDs are valid clients
      const { data: clients, error: clientsError } = await supabase
        .from('users')
        .select('id, role')
        .in('id', clientIds)
        .eq('role', 'client');

      if (clientsError || !clients || clients.length !== clientIds.length) {
        return res.status(400).json({ error: 'One or more client IDs are invalid or not clients' });
      }

      // Update resource with assigned client IDs
      const { data: updatedResource, error } = await supabase
        .from('resources')
        .update({ assigned_client_ids: clientIds })
        .eq('id', req.params.id)
        .select()
        .single();

      if (error) {
        console.error('Error assigning resource:', error);
        return res.status(500).json({ error: 'Failed to assign resource' });
      }

      res.json(updatedResource);
    } catch (error) {
      console.error('Error assigning resource:', error);
      res.status(500).json({ error: 'Failed to assign resource' });
    }
  },
};
