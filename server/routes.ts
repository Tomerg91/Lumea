// @ts-nocheck
import type { Express, Request, Response, NextFunction } from 'express';
import { createServer, type Server } from 'http';
import { SupabaseStorageAdapter, ResourceFilters } from './src/lib/storageAdapter.js';
import { setupAuth } from './auth';

// Initialize the new Supabase storage adapter
const storage = new SupabaseStorageAdapter();
import { registerAudioRoutes } from './routes/audio';
import { z } from 'zod';
import { getNumericUserId, validateWithSchema } from './utils';
import {
  insertUserLinkSchema,
  insertSessionSchema,
  insertReflectionSchema,
  insertPaymentSchema,
  insertResourceSchema,
  insertResourceAccessSchema,
} from '@shared/schema';
import {
  ValidatedUserLink,
  ValidatedSession,
  ValidatedReflection,
  ValidatedPayment,
  ValidatedResource,
  ValidatedResourceAccess,
} from './src/types/schema-types';

// Middleware to check if user is authenticated
const ensureAuthenticated = (req: Request, res: Response, next: NextFunction): void => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Not authenticated' });
};

// Middleware to check if user is a coach
const ensureCoach = (req: Request, res: Response, next: NextFunction): void => {
  if (req.isAuthenticated() && req.user?.role === 'coach') {
    return next();
  }
  res.status(403).json({ message: 'Coach access required' });
};

// Middleware to check if user is a client
const ensureClient = (req: Request, res: Response, next: NextFunction): void => {
  if (req.isAuthenticated() && req.user?.role === 'client') {
    return next();
  }
  res.status(403).json({ message: 'Client access required' });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);

  // Register audio upload and serving routes
  registerAudioRoutes(app);

  // Endpoint to check for and send reflection reminders
  app.get('/api/sessions/reminders', ensureAuthenticated, async (req, res, next) => {
    if (!req.user) {
      return res.status(500).json({ message: 'Authentication error: User context missing.' });
    }
    const userId: number = getNumericUserId(req);
    const userRole = req.user.role;
    try {
      const allSessions =
        userRole === 'coach'
          ? await storage.getSessionsByCoachId(userId)
          : await storage.getSessionsByClientId(userId);

      const needsReminder = allSessions.filter(
        (session) =>
          session.status === 'completed' &&
          ((userRole === 'coach' && !session.coachReflectionReminderSent) ||
            (userRole === 'client' && !session.clientReflectionReminderSent))
      );

      if (needsReminder.length > 0) {
        const mostRecentSession = needsReminder.reduce(
          (latest, session) =>
            new Date(session.dateTime) > new Date(latest.dateTime) ? session : latest,
          needsReminder[0]
        );

        const reminderUpdate =
          userRole === 'coach'
            ? { coachReflectionReminderSent: true }
            : { clientReflectionReminderSent: true };

        await storage.updateSession(mostRecentSession.id, reminderUpdate);

        let participantInfo = null;
        if (userRole === 'coach') {
          const client = await storage.getUser(mostRecentSession.clientId);
          if (client) {
            participantInfo = {
              id: client.id,
              name: client.name,
              profilePicture: client.profilePicture,
            };
          }
        } else {
          const coach = await storage.getUser(mostRecentSession.coachId);
          if (coach) {
            participantInfo = {
              id: coach.id,
              name: coach.name,
              profilePicture: coach.profilePicture,
            };
          }
        }

        res.json({
          needsReflection: true,
          session: mostRecentSession,
          participant: participantInfo,
        });
      } else {
        res.json({
          needsReflection: false,
        });
      }
    } catch (error) {
      next(error);
    }
  });

  // User Profile routes
  app.patch('/api/user', ensureAuthenticated, async (req, res, next) => {
    if (!req.user) {
      return res.status(500).json({ message: 'Authentication error: User context missing.' });
    }
    const userId: number = getNumericUserId(req);
    const userEmail = req.user.email;
    try {
      const updateSchema = z.object({
        name: z.string().optional(),
        email: z.string().email().optional(),
        profilePicture: z.string().optional(),
        phone: z.string().optional(),
        bio: z.string().optional(),
      });

      const validatedData = validateWithSchema(updateSchema, req.body);

      if (validatedData.email && validatedData.email !== userEmail) {
        const existingUser = await storage.getUserByEmail(validatedData.email);
        if (existingUser) {
          return res.status(409).json({ message: 'Email already in use' });
        }
      }

      const updatedUser = await storage.updateUser(userId, validatedData);

      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      next(error);
    }
  });

  // Password change endpoint
  app.post('/api/user/change-password', ensureAuthenticated, async (req, res, next) => {
    if (!req.user) {
      return res.status(500).json({ message: 'Authentication error: User context missing.' });
    }
    const userId: number = getNumericUserId(req);
    try {
      const passwordSchema = z
        .object({
          currentPassword: z.string(),
          newPassword: z.string().min(6),
          confirmPassword: z.string(),
        })
        .refine((data) => data.newPassword === data.confirmPassword, {
          message: "Passwords don't match",
          path: ['confirmPassword'],
        });

      const validatedData = validateWithSchema(passwordSchema, req.body);

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (validatedData.currentPassword !== user.password) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }

      const updatedUser = await storage.updateUser(userId, {
        password: validatedData.newPassword,
      });

      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
      next(error);
    }
  });

  // Coach-Client Link routes
  app.post('/api/links', ensureCoach, async (req, res, next) => {
    if (!req.user) {
      return res.status(500).json({ message: 'Authentication error: User context missing.' });
    }
    const coachId: number = getNumericUserId(req);
    try {
      // Explicitly type the validation result
      const validatedData = validateWithSchema<typeof insertUserLinkSchema>(
        insertUserLinkSchema,
        req.body
      );

      if (validatedData.coachId !== coachId) {
        return res
          .status(403)
          .json({ message: 'You can only create links for yourself as a coach' });
      }

      const client = await storage.getUser(validatedData.clientId);
      if (!client || client.role !== 'client') {
        return res.status(404).json({ message: 'Client not found' });
      }

      const existingLink = await storage.getUserLink(coachId, validatedData.clientId);
      if (existingLink) {
        return res.status(409).json({ message: 'Link already exists' });
      }

      const userLink = await storage.createUserLink(validatedData);
      res.status(201).json(userLink);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/links/coach', ensureCoach, async (req, res, next) => {
    if (!req.user) {
      return res.status(500).json({ message: 'Authentication error: User context missing.' });
    }
    const coachId: number = getNumericUserId(req);
    try {
      const links = await storage.getUserLinksByCoachId(coachId);

      const linksWithClientDetails = await Promise.all(
        links.map(async (link) => {
          const client = await storage.getUser(link.clientId);
          return {
            ...link,
            client: client
              ? {
                  id: client.id,
                  name: client.name,
                  email: client.email,
                  profilePicture: client.profilePicture,
                  role: client.role,
                }
              : null,
          };
        })
      );

      res.json(linksWithClientDetails);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/links/client', ensureClient, async (req, res, next) => {
    try {
      const userId = getNumericUserId(req);
      const links = await storage.getUserLinksByClientId(userId);

      const linksWithCoachDetails = await Promise.all(
        links.map(async (link) => {
          const coach = await storage.getUser(link.coachId);
          return {
            ...link,
            coach: coach
              ? {
                  id: coach.id,
                  name: coach.name,
                  email: coach.email,
                  profilePicture: coach.profilePicture,
                  role: coach.role,
                }
              : null,
          };
        })
      );

      res.json(linksWithCoachDetails);
    } catch (error) {
      next(error);
    }
  });

  // Session routes
  app.post('/api/sessions', ensureCoach, async (req, res, next) => {
    try {
      // Explicitly type the validation result
      const validatedData = validateWithSchema<typeof insertSessionSchema>(
        insertSessionSchema,
        req.body
      );

      if (validatedData.coachId !== getNumericUserId(req)) {
        return res
          .status(403)
          .json({ message: 'You can only create sessions for yourself as a coach' });
      }

      const link = await storage.getUserLink(getNumericUserId(req), validatedData.clientId);
      if (!link) {
        return res.status(404).json({ message: 'Client not linked to this coach' });
      }

      const session = await storage.createSession(validatedData);
      res.status(201).json(session);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/sessions/coach', ensureCoach, async (req, res, next) => {
    try {
      const sessions = await storage.getSessionsByCoachId(getNumericUserId(req));
      res.json(sessions);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/sessions/client', ensureClient, async (req, res, next) => {
    try {
      const sessions = await storage.getSessionsByClientId(getNumericUserId(req));
      res.json(sessions);
    } catch (error) {
      next(error);
    }
  });

  app.put('/api/sessions/:id', ensureAuthenticated, async (req, res, next) => {
    try {
      const sessionId = parseInt(req.params.id);
      const session = await storage.getSessionById(sessionId);

      if (!session) {
        return res.status(404).json({ message: 'Session not found' });
      }

      if (session.coachId !== getNumericUserId(req) && session.clientId !== getNumericUserId(req)) {
        return res.status(403).json({ message: 'Not authorized to update this session' });
      }

      let validatedData;
      const userRole = req.user?.role;
      if (userRole === 'coach') {
        const updateSchema = z.object({
          dateTime: z.date().optional(),
          duration: z.number().optional(),
          status: z.enum(['scheduled', 'completed', 'cancelled', 'rescheduled']).optional(),
          textNotes: z.string().optional(),
          audioNotes: z.string().optional(),
          clientReflectionReminderSent: z.boolean().optional(),
          coachReflectionReminderSent: z.boolean().optional(),
        });
        validatedData = validateWithSchema(updateSchema, req.body);
      } else {
        const updateSchema = z.object({
          status: z.enum(['scheduled', 'cancelled', 'rescheduled']).optional(),
          clientReflectionReminderSent: z.boolean().optional(),
        });
        validatedData = validateWithSchema(updateSchema, req.body);
      }

      if (validatedData.status === 'completed' && session.status !== 'completed') {
        validatedData = {
          ...validatedData,
          clientReflectionReminderSent: false,
          coachReflectionReminderSent: false,
        };
      }

      const updatedSession = await storage.updateSession(sessionId, validatedData);
      if (!updatedSession) {
        return res.status(404).json({ message: 'Session not found' });
      }

      res.json(updatedSession);
    } catch (error) {
      next(error);
    }
  });

  // Reflection routes
  app.post('/api/reflections', ensureClient, async (req, res, next) => {
    try {
      // Explicitly type the validation result
      const validatedData = validateWithSchema<typeof insertReflectionSchema>(
        insertReflectionSchema,
        req.body
      );

      if (validatedData.clientId !== getNumericUserId(req)) {
        return res.status(403).json({ message: 'You can only create reflections for yourself' });
      }

      if (validatedData.sessionId) {
        const session = await storage.getSessionById(validatedData.sessionId);
        if (!session || session.clientId !== getNumericUserId(req)) {
          return res
            .status(404)
            .json({ message: 'Session not found or not associated with this client' });
        }
      }

      const reflection = await storage.createReflection(validatedData);
      res.status(201).json(reflection);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/reflections/client', ensureClient, async (req, res, next) => {
    try {
      const reflections = await storage.getReflectionsByClientId(getNumericUserId(req));
      res.json(reflections);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/reflections/coach', ensureCoach, async (req, res, next) => {
    try {
      const reflections = await storage.getSharedReflectionsForCoach(getNumericUserId(req));

      const reflectionsWithClientDetails = await Promise.all(
        reflections.map(async (reflection) => {
          const client = await storage.getUser(reflection.clientId);
          return {
            ...reflection,
            client: client
              ? {
                  id: client.id,
                  name: client.name,
                  email: client.email,
                  profilePicture: client.profilePicture,
                }
              : null,
          };
        })
      );

      res.json(reflectionsWithClientDetails);
    } catch (error) {
      next(error);
    }
  });

  // Payment routes
  app.post('/api/payments', ensureCoach, async (req, res, next) => {
    try {
      // Explicitly type the validation result
      const validatedData = validateWithSchema<typeof insertPaymentSchema>(
        insertPaymentSchema,
        req.body
      );

      if (validatedData.coachId !== getNumericUserId(req)) {
        return res
          .status(403)
          .json({ message: 'You can only create payments for yourself as a coach' });
      }

      const link = await storage.getUserLink(getNumericUserId(req), validatedData.clientId);
      if (!link) {
        return res.status(404).json({ message: 'Client not linked to this coach' });
      }

      const payment = await storage.createPayment(validatedData);
      res.status(201).json(payment);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/payments/coach', ensureCoach, async (req, res, next) => {
    try {
      const payments = await storage.getPaymentsByCoachId(getNumericUserId(req));

      const paymentsWithClientDetails = await Promise.all(
        payments.map(async (payment) => {
          const client = await storage.getUser(payment.clientId);
          return {
            ...payment,
            client: client
              ? {
                  id: client.id,
                  name: client.name,
                  email: client.email,
                  profilePicture: client.profilePicture,
                }
              : null,
          };
        })
      );

      res.json(paymentsWithClientDetails);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/payments/client', ensureClient, async (req, res, next) => {
    try {
      const payments = await storage.getPaymentsByClientId(getNumericUserId(req));

      const paymentsWithCoachDetails = await Promise.all(
        payments.map(async (payment) => {
          const coach = await storage.getUser(payment.coachId);
          return {
            ...payment,
            coach: coach
              ? {
                  id: coach.id,
                  name: coach.name,
                  email: coach.email,
                  profilePicture: coach.profilePicture,
                }
              : null,
          };
        })
      );

      res.json(paymentsWithCoachDetails);
    } catch (error) {
      next(error);
    }
  });

  app.put('/api/payments/:id', ensureCoach, async (req, res, next) => {
    try {
      const paymentId = parseInt(req.params.id);
      const payment = await storage.getPaymentById(paymentId);

      if (!payment) {
        return res.status(404).json({ message: 'Payment not found' });
      }

      if (payment.coachId !== getNumericUserId(req)) {
        return res.status(403).json({ message: 'Not authorized to update this payment' });
      }

      const updateSchema = z.object({
        amount: z.number().optional(),
        dueDate: z.date().optional(),
        status: z.enum(['pending', 'paid', 'overdue']).optional(),
        reminderSent: z.boolean().optional(),
        sessionsCovered: z.number().optional(),
      });

      const validatedData = validateWithSchema(updateSchema, req.body);
      const updatedPayment = await storage.updatePayment(paymentId, validatedData);

      if (!updatedPayment) {
        return res.status(404).json({ message: 'Payment not found' });
      }

      res.json(updatedPayment);
    } catch (error) {
      next(error);
    }
  });

  // Resource routes
  app.post('/api/resources', ensureCoach, async (req, res, next) => {
    try {
      // Explicitly type the validation result
      const validatedData = validateWithSchema<typeof insertResourceSchema>(
        insertResourceSchema,
        req.body
      );

      if (validatedData.coachId !== getNumericUserId(req)) {
        return res
          .status(403)
          .json({ message: 'You can only create resources for yourself as a coach' });
      }

      const resource = await storage.createResource(validatedData);
      res.status(201).json(resource);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/resources/coach', ensureCoach, async (req, res, next) => {
    try {
      const resources = await storage.getResourcesByCoachId(getNumericUserId(req));
      res.json(resources);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/resources/client', ensureClient, async (req, res, next) => {
    try {
      const resources = await storage.getVisibleResourcesForClient(getNumericUserId(req));

      const resourcesWithCoachDetails = await Promise.all(
        resources.map(async (resource) => {
          const coach = await storage.getUser(resource.coachId);
          return {
            ...resource,
            coach: coach
              ? {
                  id: coach.id,
                  name: coach.name,
                  email: coach.email,
                  profilePicture: coach.profilePicture,
                }
              : null,
          };
        })
      );

      res.json(resourcesWithCoachDetails);
    } catch (error) {
      next(error);
    }
  });

  // Advanced resource filtering for clients
  app.post('/api/resources/client/filter', ensureClient, async (req, res, next) => {
    try {
      const filterSchema = z.object({
        type: z.union([z.string(), z.array(z.string())]).optional(),
        category: z.union([z.string(), z.array(z.string())]).optional(),
        tags: z.array(z.string()).optional(),
        difficulty: z.string().optional(),
        search: z.string().optional(),
        featured: z.boolean().optional(),
        languageCode: z.string().optional(),
        minDuration: z.number().optional(),
        maxDuration: z.number().optional(),
      });

      const validatedFilters = validateWithSchema(filterSchema, req.body);
      const resources = await storage.getVisibleResourcesForClientByFilters(
        getNumericUserId(req),
        validatedFilters
      );

      const resourcesWithCoachDetails = await Promise.all(
        resources.map(async (resource) => {
          const coach = await storage.getUser(resource.coachId);
          return {
            ...resource,
            coach: coach
              ? {
                  id: coach.id,
                  name: coach.name,
                  email: coach.email,
                  profilePicture: coach.profilePicture,
                }
              : null,
          };
        })
      );

      res.json(resourcesWithCoachDetails);
    } catch (error) {
      next(error);
    }
  });

  // Advanced resource filtering for coaches
  app.post('/api/resources/coach/filter', ensureCoach, async (req, res, next) => {
    try {
      const filterSchema = z.object({
        type: z.union([z.string(), z.array(z.string())]).optional(),
        category: z.union([z.string(), z.array(z.string())]).optional(),
        tags: z.array(z.string()).optional(),
        difficulty: z.string().optional(),
        search: z.string().optional(),
        featured: z.boolean().optional(),
        languageCode: z.string().optional(),
        minDuration: z.number().optional(),
        maxDuration: z.number().optional(),
      });

      const validatedFilters = validateWithSchema(filterSchema, req.body);
      const resources = await storage.getResourcesByCoachIdAndFilters(
        getNumericUserId(req),
        validatedFilters
      );
      res.json(resources);
    } catch (error) {
      next(error);
    }
  });

  // Get featured resources
  app.get('/api/resources/featured', ensureAuthenticated, async (req, res, next) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const resources = await storage.getFeaturedResources(limit);

      let filteredResources = resources;
      if (req.user?.role === 'client') {
        const visibleResources = await storage.getVisibleResourcesForClient(getNumericUserId(req));
        const visibleIds = new Set(visibleResources.map((r) => r.id));
        filteredResources = resources.filter((r) => visibleIds.has(r.id));
      }

      res.json(filteredResources);
    } catch (error) {
      next(error);
    }
  });

  // Get resources by category
  app.get('/api/resources/category/:category', ensureAuthenticated, async (req, res, next) => {
    try {
      const category = req.params.category;
      let resources = await storage.getResourcesByCategory(category);

      if (req.user?.role === 'client') {
        const visibleResources = await storage.getVisibleResourcesForClient(getNumericUserId(req));
        const visibleIds = new Set(visibleResources.map((r) => r.id));
        resources = resources.filter((r) => visibleIds.has(r.id));
      } else if (req.user?.role === 'coach') {
        resources = resources.filter((r) => r.coachId === getNumericUserId(req));
      }

      res.json(resources);
    } catch (error) {
      next(error);
    }
  });

  // Get resources by tag
  app.get('/api/resources/tag/:tag', ensureAuthenticated, async (req, res, next) => {
    try {
      const tag = req.params.tag;
      let resources = await storage.getResourcesByTag(tag);

      if (req.user?.role === 'client') {
        const visibleResources = await storage.getVisibleResourcesForClient(getNumericUserId(req));
        const visibleIds = new Set(visibleResources.map((r) => r.id));
        resources = resources.filter((r) => visibleIds.has(r.id));
      } else if (req.user?.role === 'coach') {
        resources = resources.filter((r) => r.coachId === getNumericUserId(req));
      }

      res.json(resources);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/resource-access', ensureCoach, async (req, res, next) => {
    try {
      // Explicitly type the validation result
      const validatedData = validateWithSchema<typeof insertResourceAccessSchema>(
        insertResourceAccessSchema,
        req.body
      );

      const resource = await storage.getResourceById(validatedData.resourceId);
      if (!resource || resource.coachId !== getNumericUserId(req)) {
        return res.status(404).json({ message: 'Resource not found or not owned by this coach' });
      }

      const link = await storage.getUserLink(getNumericUserId(req), validatedData.clientId);
      if (!link) {
        return res.status(404).json({ message: 'Client not linked to this coach' });
      }

      const resourceAccess = await storage.createResourceAccess(validatedData);
      res.status(201).json(resourceAccess);
    } catch (error) {
      next(error);
    }
  });

  // Client invitation functionality
  app.post('/api/clients/invite', ensureCoach, async (req, res, next) => {
    try {
      const inviteSchema = z.object({
        name: z.string().min(2),
        email: z.string().email(),
        message: z.string().optional(),
      });

      const validatedData = validateWithSchema(inviteSchema, req.body);

      const existingUser = await storage.getUserByEmail(validatedData.email);

      if (existingUser) {
        if (existingUser.role === 'client') {
          const existingLink = await storage.getUserLink(getNumericUserId(req), existingUser.id);

          if (existingLink) {
            return res.status(409).json({
              message: 'This client is already linked to your account',
              clientId: existingUser.id,
            });
          }

          const userLink = await storage.createUserLink({
            coachId: getNumericUserId(req),
            clientId: existingUser.id,
            status: 'active',
          });

          return res.status(201).json({
            message: 'Existing client linked successfully',
            link: userLink,
            isNewUser: false,
          });
        } else {
          return res.status(409).json({
            message: 'A user with this email already exists but is not a client',
          });
        }
      }

      const invitationId = Math.random().toString(36).substring(2, 15);

      const invitationLink = `/join/${invitationId}?email=${encodeURIComponent(validatedData.email)}&name=${encodeURIComponent(validatedData.name)}&coach=${getNumericUserId(req)}&coachName=${encodeURIComponent(req.user?.name || '')}`;

      res.status(200).json({
        message: 'Invitation created successfully',
        invitationLink,
        coachId: getNumericUserId(req),
        email: validatedData.email,
        name: validatedData.name,
      });
    } catch (error) {
      next(error);
    }
  });

  // Client invite acceptance endpoint
  app.post('/api/clients/join', async (req, res, next) => {
    try {
      const joinSchema = z.object({
        name: z.string().min(2),
        email: z.string().email(),
        password: z.string().min(6),
        coachId: z.number(),
      });

      const validatedData = validateWithSchema(joinSchema, req.body);

      const existingUser = await storage.getUserByEmail(validatedData.email);

      if (existingUser) {
        return res.status(409).json({ message: 'Email already in use' });
      }

      const coach = await storage.getUser(validatedData.coachId);
      if (!coach || coach.role !== 'coach') {
        return res.status(404).json({ message: 'Coach not found' });
      }

      const newUser = await storage.createUser({
        name: validatedData.name,
        email: validatedData.email,
        password: validatedData.password,
        role: 'client',
      });

      const userLink = await storage.createUserLink({
        coachId: validatedData.coachId,
        clientId: newUser.id,
        status: 'active',
      });

      res.status(201).json({
        message: 'Client account created successfully',
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
        },
        link: userLink,
      });
    } catch (error) {
      next(error);
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
