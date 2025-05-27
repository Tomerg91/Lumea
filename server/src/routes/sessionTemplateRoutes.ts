import express, { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { SessionTemplate } from '../models/SessionTemplate';
import { TemplateSession } from '../models/TemplateSession';
import { CoachingSession } from '../models/CoachingSession';
import { isAuthenticated, isCoach } from '../middlewares/auth';
import { cacheResponse, clearCache } from '../middleware/cache';
import { sessionTemplateSchemas } from '../schemas/validation';
import { Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Cache configuration for session templates
const TEMPLATE_CACHE_TTL = 600; // 10 minutes
const TEMPLATE_CACHE_PREFIX = 'session-templates';

/**
 * GET /api/session-templates
 * Get session templates for the authenticated coach
 */
router.get(
  '/',
  isAuthenticated,
  isCoach,
  cacheResponse({ ttl: TEMPLATE_CACHE_TTL, keyPrefix: TEMPLATE_CACHE_PREFIX }),
  async (req: Request, res: Response) => {
    try {
      const validation = sessionTemplateSchemas.query.safeParse(req.query);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validation.error.errors,
        });
      }

      const { 
        type, 
        category, 
        isRecurring, 
        isActive = true, 
        isPublic, 
        tags, 
        search, 
        limit, 
        page, 
        sortBy, 
        sortOrder 
      } = validation.data;

      const coachId = req.user?.id;
      if (!coachId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      // Build query
      const query: any = {
        $or: [
          { coachId: new Types.ObjectId(coachId), isActive },
          { isPublic: true, isActive: true }
        ]
      };

      if (type) query.type = type;
      if (category) query.category = category;
      if (isRecurring !== undefined) query.isRecurring = isRecurring;
      if (isPublic !== undefined) {
        if (isPublic) {
          query.isPublic = true;
        } else {
          query.coachId = new Types.ObjectId(coachId);
          delete query.$or;
        }
      }

      if (tags) {
        const tagArray = tags.split(',').map(tag => tag.trim());
        query.tags = { $in: tagArray };
      }

      if (search) {
        query.$text = { $search: search };
      }

      // Execute query with pagination
      const skip = (page - 1) * limit;
      const sortOptions: any = {};
      sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

      const [templates, total] = await Promise.all([
        SessionTemplate.find(query)
          .populate('coachId', 'firstName lastName email')
          .sort(sortOptions)
          .skip(skip)
          .limit(limit)
          .lean(),
        SessionTemplate.countDocuments(query)
      ]);

      res.status(200).json({
        success: true,
        data: {
          templates,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      console.error('Error fetching session templates:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch session templates',
      });
    }
  }
);

/**
 * GET /api/session-templates/:id
 * Get a specific session template by ID
 */
router.get(
  '/:id',
  isAuthenticated,
  isCoach,
  [param('id').isMongoId().withMessage('Invalid template ID')],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { id } = req.params;
      const coachId = req.user?.id;

      const template = await SessionTemplate.findOne({
        _id: id,
        $or: [
          { coachId: new Types.ObjectId(coachId) },
          { isPublic: true, isActive: true }
        ]
      }).populate('coachId', 'firstName lastName email');

      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Template not found',
        });
      }

      res.status(200).json({
        success: true,
        data: { template },
      });
    } catch (error) {
      console.error('Error fetching session template:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch session template',
      });
    }
  }
);

/**
 * POST /api/session-templates
 * Create a new session template
 */
router.post(
  '/',
  isAuthenticated,
  isCoach,
  clearCache(TEMPLATE_CACHE_PREFIX),
  async (req: Request, res: Response) => {
    try {
      const validation = sessionTemplateSchemas.create.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validation.error.errors,
        });
      }

      const coachId = req.user?.id;
      if (!coachId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      const templateData = {
        ...validation.data,
        coachId: new Types.ObjectId(coachId),
      };

      const template = new SessionTemplate(templateData);
      await template.save();

      await template.populate('coachId', 'firstName lastName email');

      res.status(201).json({
        success: true,
        message: 'Session template created successfully',
        data: { template },
      });
    } catch (error) {
      console.error('Error creating session template:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create session template',
      });
    }
  }
);

/**
 * PUT /api/session-templates/:id
 * Update a session template
 */
router.put(
  '/:id',
  isAuthenticated,
  isCoach,
  clearCache(TEMPLATE_CACHE_PREFIX),
  [param('id').isMongoId().withMessage('Invalid template ID')],
  async (req: Request, res: Response) => {
    try {
      const paramErrors = validationResult(req);
      if (!paramErrors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: paramErrors.array(),
        });
      }

      const validation = sessionTemplateSchemas.update.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validation.error.errors,
        });
      }

      const { id } = req.params;
      const coachId = req.user?.id;

      const template = await SessionTemplate.findOne({
        _id: id,
        coachId: new Types.ObjectId(coachId),
      });

      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Template not found or access denied',
        });
      }

      // Update template
      Object.assign(template, validation.data);
      await template.save();

      await template.populate('coachId', 'firstName lastName email');

      res.status(200).json({
        success: true,
        message: 'Session template updated successfully',
        data: { template },
      });
    } catch (error) {
      console.error('Error updating session template:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update session template',
      });
    }
  }
);

/**
 * DELETE /api/session-templates/:id
 * Delete (deactivate) a session template
 */
router.delete(
  '/:id',
  isAuthenticated,
  isCoach,
  clearCache(TEMPLATE_CACHE_PREFIX),
  [param('id').isMongoId().withMessage('Invalid template ID')],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { id } = req.params;
      const coachId = req.user?.id;

      const template = await SessionTemplate.findOne({
        _id: id,
        coachId: new Types.ObjectId(coachId),
      });

      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Template not found or access denied',
        });
      }

      // Soft delete by deactivating
      template.isActive = false;
      await template.save();

      res.status(200).json({
        success: true,
        message: 'Session template deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting session template:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete session template',
      });
    }
  }
);

/**
 * POST /api/session-templates/:id/clone
 * Clone a session template
 */
router.post(
  '/:id/clone',
  isAuthenticated,
  isCoach,
  clearCache(TEMPLATE_CACHE_PREFIX),
  [param('id').isMongoId().withMessage('Invalid template ID')],
  async (req: Request, res: Response) => {
    try {
      const paramErrors = validationResult(req);
      if (!paramErrors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: paramErrors.array(),
        });
      }

      const validation = sessionTemplateSchemas.clone.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validation.error.errors,
        });
      }

      const { id } = req.params;
      const coachId = req.user?.id;

      const originalTemplate = await SessionTemplate.findOne({
        _id: id,
        $or: [
          { coachId: new Types.ObjectId(coachId) },
          { isPublic: true, isActive: true }
        ]
      });

      if (!originalTemplate) {
        return res.status(404).json({
          success: false,
          message: 'Template not found',
        });
      }

      // Create cloned template
      const clonedData = {
        ...originalTemplate.toObject(),
        _id: undefined,
        coachId: new Types.ObjectId(coachId),
        name: validation.data.name,
        description: validation.data.description || originalTemplate.description,
        isPublic: validation.data.isPublic,
        category: validation.data.category || originalTemplate.category,
        tags: validation.data.tags || originalTemplate.tags,
        parentTemplateId: originalTemplate._id,
        version: 1,
        usageCount: 0,
        lastUsed: undefined,
        customizations: [], // Reset customizations for cloned template
        createdAt: undefined,
        updatedAt: undefined,
      };

      const clonedTemplate = new SessionTemplate(clonedData);
      await clonedTemplate.save();

      await clonedTemplate.populate('coachId', 'firstName lastName email');

      res.status(201).json({
        success: true,
        message: 'Session template cloned successfully',
        data: { template: clonedTemplate },
      });
    } catch (error) {
      console.error('Error cloning session template:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to clone session template',
      });
    }
  }
);

/**
 * POST /api/session-templates/:id/customize
 * Create or update client-specific customization for a template
 */
router.post(
  '/:id/customize',
  isAuthenticated,
  isCoach,
  [param('id').isMongoId().withMessage('Invalid template ID')],
  async (req: Request, res: Response) => {
    try {
      const paramErrors = validationResult(req);
      if (!paramErrors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: paramErrors.array(),
        });
      }

      const validation = sessionTemplateSchemas.customization.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validation.error.errors,
        });
      }

      const { id } = req.params;
      const coachId = req.user?.id;
      const { clientId, overrides, customFields } = validation.data;

      const template = await SessionTemplate.findOne({
        _id: id,
        coachId: new Types.ObjectId(coachId),
      });

      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Template not found or access denied',
        });
      }

      await template.createCustomization(new Types.ObjectId(clientId), overrides);

      res.status(200).json({
        success: true,
        message: 'Template customization saved successfully',
        data: { 
          customization: template.getCustomizationForClient(new Types.ObjectId(clientId))
        },
      });
    } catch (error) {
      console.error('Error customizing session template:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to customize session template',
      });
    }
  }
);

/**
 * POST /api/session-templates/:id/generate-session
 * Generate a session from a template
 */
router.post(
  '/:id/generate-session',
  isAuthenticated,
  isCoach,
  [param('id').isMongoId().withMessage('Invalid template ID')],
  async (req: Request, res: Response) => {
    try {
      const paramErrors = validationResult(req);
      if (!paramErrors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: paramErrors.array(),
        });
      }

      const validation = sessionTemplateSchemas.generateSession.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validation.error.errors,
        });
      }

      const { id } = req.params;
      const coachId = req.user?.id;
      const { clientId, scheduledDate, customizations, applyClientCustomization } = validation.data;

      const template = await SessionTemplate.findOne({
        _id: id,
        $or: [
          { coachId: new Types.ObjectId(coachId) },
          { isPublic: true, isActive: true }
        ]
      });

      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Template not found',
        });
      }

      // Get client customization if requested
      let appliedCustomizations = customizations;
      if (applyClientCustomization) {
        const clientCustomization = template.getCustomizationForClient(new Types.ObjectId(clientId));
        if (clientCustomization) {
          appliedCustomizations = {
            ...clientCustomization.overrides,
            ...customizations, // Request customizations override client customizations
          };
        }
      }

      // Create session from template
      const sessionData = {
        coachId: new Types.ObjectId(coachId),
        clientId: new Types.ObjectId(clientId),
        date: new Date(scheduledDate),
        duration: appliedCustomizations?.duration || template.defaultDuration,
        status: 'pending' as const,
        notes: appliedCustomizations?.notes || template.defaultNotes || '',
      };

      const session = new CoachingSession(sessionData);
      await session.save();

      // Create template session tracking record
      const templateSession = new TemplateSession({
        templateId: template._id,
        sessionId: session._id,
        coachId: new Types.ObjectId(coachId),
        clientId: new Types.ObjectId(clientId),
        generationStatus: 'generated',
        generatedBy: new Types.ObjectId(coachId),
        templateSnapshot: {
          name: template.name,
          version: template.version,
          structure: template.structure,
          objectives: template.objectives,
          defaultDuration: template.defaultDuration,
        },
        appliedCustomizations,
        generationMetadata: {
          source: 'manual',
        },
      });

      await templateSession.save();

      // Update template usage
      await template.incrementUsage();

      await session.populate('clientId', 'firstName lastName email');

      res.status(201).json({
        success: true,
        message: 'Session generated from template successfully',
        data: { 
          session,
          templateSession: templateSession._id,
        },
      });
    } catch (error) {
      console.error('Error generating session from template:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate session from template',
      });
    }
  }
);

/**
 * GET /api/session-templates/:id/usage-stats
 * Get usage statistics for a template
 */
router.get(
  '/:id/usage-stats',
  isAuthenticated,
  isCoach,
  [param('id').isMongoId().withMessage('Invalid template ID')],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { id } = req.params;
      const coachId = req.user?.id;

      const template = await SessionTemplate.findOne({
        _id: id,
        coachId: new Types.ObjectId(coachId),
      });

      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Template not found or access denied',
        });
      }

             const usageStats = await TemplateSession.getTemplateUsageStats(template._id as Types.ObjectId);

      res.status(200).json({
        success: true,
        data: { 
          template: {
            id: template._id,
            name: template.name,
            usageCount: template.usageCount,
            lastUsed: template.lastUsed,
          },
          usageStats,
        },
      });
    } catch (error) {
      console.error('Error fetching template usage stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch template usage statistics',
      });
    }
  }
);

export default router; 