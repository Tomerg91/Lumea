import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import { 
  insertUserLinkSchema, 
  insertSessionSchema, 
  insertReflectionSchema, 
  insertPaymentSchema, 
  insertResourceSchema,
  insertResourceAccessSchema
} from "@shared/schema";

// Middleware to check if user is authenticated
const ensureAuthenticated = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Not authenticated" });
};

// Middleware to check if user is a coach
const ensureCoach = (req: any, res: any, next: any) => {
  if (req.isAuthenticated() && req.user.role === "coach") {
    return next();
  }
  res.status(403).json({ message: "Coach access required" });
};

// Middleware to check if user is a client
const ensureClient = (req: any, res: any, next: any) => {
  if (req.isAuthenticated() && req.user.role === "client") {
    return next();
  }
  res.status(403).json({ message: "Client access required" });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);

  // User Profile routes
  app.put("/api/user/profile", ensureAuthenticated, async (req, res, next) => {
    try {
      const updateSchema = z.object({
        name: z.string().optional(),
        profilePicture: z.string().optional(),
      });

      const validatedData = updateSchema.parse(req.body);
      const updatedUser = await storage.updateUser(req.user!.id, validatedData);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove sensitive data
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      next(error);
    }
  });

  // Coach-Client Link routes
  app.post("/api/links", ensureCoach, async (req, res, next) => {
    try {
      const validatedData = insertUserLinkSchema.parse(req.body);
      
      // Ensure the coach is creating links for themselves
      if (validatedData.coachId !== req.user!.id) {
        return res.status(403).json({ message: "You can only create links for yourself as a coach" });
      }
      
      // Check if client exists and is a client
      const client = await storage.getUser(validatedData.clientId);
      if (!client || client.role !== "client") {
        return res.status(404).json({ message: "Client not found" });
      }
      
      // Check if link already exists
      const existingLink = await storage.getUserLink(validatedData.coachId, validatedData.clientId);
      if (existingLink) {
        return res.status(409).json({ message: "Link already exists" });
      }
      
      const userLink = await storage.createUserLink(validatedData);
      res.status(201).json(userLink);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/links/coach", ensureCoach, async (req, res, next) => {
    try {
      const links = await storage.getUserLinksByCoachId(req.user!.id);
      
      // Fetch client details for each link
      const linksWithClientDetails = await Promise.all(
        links.map(async (link) => {
          const client = await storage.getUser(link.clientId);
          return {
            ...link,
            client: client ? {
              id: client.id,
              name: client.name,
              email: client.email,
              profilePicture: client.profilePicture,
              role: client.role,
            } : null,
          };
        })
      );
      
      res.json(linksWithClientDetails);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/links/client", ensureClient, async (req, res, next) => {
    try {
      const links = await storage.getUserLinksByClientId(req.user!.id);
      
      // Fetch coach details for each link
      const linksWithCoachDetails = await Promise.all(
        links.map(async (link) => {
          const coach = await storage.getUser(link.coachId);
          return {
            ...link,
            coach: coach ? {
              id: coach.id,
              name: coach.name,
              email: coach.email,
              profilePicture: coach.profilePicture,
              role: coach.role,
            } : null,
          };
        })
      );
      
      res.json(linksWithCoachDetails);
    } catch (error) {
      next(error);
    }
  });

  // Session routes
  app.post("/api/sessions", ensureCoach, async (req, res, next) => {
    try {
      const validatedData = insertSessionSchema.parse(req.body);
      
      // Ensure the coach is creating sessions for themselves
      if (validatedData.coachId !== req.user!.id) {
        return res.status(403).json({ message: "You can only create sessions for yourself as a coach" });
      }
      
      // Check if client exists and is linked to this coach
      const link = await storage.getUserLink(validatedData.coachId, validatedData.clientId);
      if (!link) {
        return res.status(404).json({ message: "Client not linked to this coach" });
      }
      
      const session = await storage.createSession(validatedData);
      res.status(201).json(session);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/sessions/coach", ensureCoach, async (req, res, next) => {
    try {
      const sessions = await storage.getSessionsByCoachId(req.user!.id);
      res.json(sessions);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/sessions/client", ensureClient, async (req, res, next) => {
    try {
      const sessions = await storage.getSessionsByClientId(req.user!.id);
      res.json(sessions);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/sessions/:id", ensureAuthenticated, async (req, res, next) => {
    try {
      const sessionId = parseInt(req.params.id);
      const session = await storage.getSessionById(sessionId);
      
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      // Check if user is authorized to update this session
      if (session.coachId !== req.user!.id && session.clientId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized to update this session" });
      }
      
      // Different update schemas based on role
      let validatedData;
      if (req.user!.role === "coach") {
        const updateSchema = z.object({
          dateTime: z.date().optional(),
          duration: z.number().optional(),
          status: z.enum(["scheduled", "completed", "cancelled", "rescheduled"]).optional(),
          textNotes: z.string().optional(),
          audioNotes: z.string().optional(),
        });
        validatedData = updateSchema.parse(req.body);
      } else {
        // Clients can only update status (for accepting/declining)
        const updateSchema = z.object({
          status: z.enum(["scheduled", "cancelled", "rescheduled"]).optional(),
        });
        validatedData = updateSchema.parse(req.body);
      }
      
      const updatedSession = await storage.updateSession(sessionId, validatedData);
      if (!updatedSession) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      res.json(updatedSession);
    } catch (error) {
      next(error);
    }
  });

  // Reflection routes
  app.post("/api/reflections", ensureClient, async (req, res, next) => {
    try {
      const validatedData = insertReflectionSchema.parse(req.body);
      
      // Ensure the client is creating reflections for themselves
      if (validatedData.clientId !== req.user!.id) {
        return res.status(403).json({ message: "You can only create reflections for yourself" });
      }
      
      // If a session is specified, validate that the client is part of that session
      if (validatedData.sessionId) {
        const session = await storage.getSessionById(validatedData.sessionId);
        if (!session || session.clientId !== req.user!.id) {
          return res.status(404).json({ message: "Session not found or not associated with this client" });
        }
      }
      
      const reflection = await storage.createReflection(validatedData);
      res.status(201).json(reflection);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/reflections/client", ensureClient, async (req, res, next) => {
    try {
      const reflections = await storage.getReflectionsByClientId(req.user!.id);
      res.json(reflections);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/reflections/coach", ensureCoach, async (req, res, next) => {
    try {
      const reflections = await storage.getSharedReflectionsForCoach(req.user!.id);
      
      // Fetch client details for each reflection
      const reflectionsWithClientDetails = await Promise.all(
        reflections.map(async (reflection) => {
          const client = await storage.getUser(reflection.clientId);
          return {
            ...reflection,
            client: client ? {
              id: client.id,
              name: client.name,
              email: client.email,
              profilePicture: client.profilePicture,
            } : null,
          };
        })
      );
      
      res.json(reflectionsWithClientDetails);
    } catch (error) {
      next(error);
    }
  });

  // Payment routes
  app.post("/api/payments", ensureCoach, async (req, res, next) => {
    try {
      const validatedData = insertPaymentSchema.parse(req.body);
      
      // Ensure the coach is creating payments for themselves
      if (validatedData.coachId !== req.user!.id) {
        return res.status(403).json({ message: "You can only create payments for yourself as a coach" });
      }
      
      // Check if client exists and is linked to this coach
      const link = await storage.getUserLink(validatedData.coachId, validatedData.clientId);
      if (!link) {
        return res.status(404).json({ message: "Client not linked to this coach" });
      }
      
      const payment = await storage.createPayment(validatedData);
      res.status(201).json(payment);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/payments/coach", ensureCoach, async (req, res, next) => {
    try {
      const payments = await storage.getPaymentsByCoachId(req.user!.id);
      
      // Fetch client details for each payment
      const paymentsWithClientDetails = await Promise.all(
        payments.map(async (payment) => {
          const client = await storage.getUser(payment.clientId);
          return {
            ...payment,
            client: client ? {
              id: client.id,
              name: client.name,
              email: client.email,
              profilePicture: client.profilePicture,
            } : null,
          };
        })
      );
      
      res.json(paymentsWithClientDetails);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/payments/client", ensureClient, async (req, res, next) => {
    try {
      const payments = await storage.getPaymentsByClientId(req.user!.id);
      
      // Fetch coach details for each payment
      const paymentsWithCoachDetails = await Promise.all(
        payments.map(async (payment) => {
          const coach = await storage.getUser(payment.coachId);
          return {
            ...payment,
            coach: coach ? {
              id: coach.id,
              name: coach.name,
              email: coach.email,
              profilePicture: coach.profilePicture,
            } : null,
          };
        })
      );
      
      res.json(paymentsWithCoachDetails);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/payments/:id", ensureCoach, async (req, res, next) => {
    try {
      const paymentId = parseInt(req.params.id);
      const payment = await storage.getPaymentById(paymentId);
      
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      
      // Check if coach is authorized to update this payment
      if (payment.coachId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized to update this payment" });
      }
      
      const updateSchema = z.object({
        amount: z.number().optional(),
        dueDate: z.date().optional(),
        status: z.enum(["pending", "paid", "overdue"]).optional(),
        reminderSent: z.boolean().optional(),
        sessionsCovered: z.number().optional(),
      });
      
      const validatedData = updateSchema.parse(req.body);
      const updatedPayment = await storage.updatePayment(paymentId, validatedData);
      
      if (!updatedPayment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      
      res.json(updatedPayment);
    } catch (error) {
      next(error);
    }
  });

  // Resource routes
  app.post("/api/resources", ensureCoach, async (req, res, next) => {
    try {
      const validatedData = insertResourceSchema.parse(req.body);
      
      // Ensure the coach is creating resources for themselves
      if (validatedData.coachId !== req.user!.id) {
        return res.status(403).json({ message: "You can only create resources for yourself as a coach" });
      }
      
      const resource = await storage.createResource(validatedData);
      res.status(201).json(resource);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/resources/coach", ensureCoach, async (req, res, next) => {
    try {
      const resources = await storage.getResourcesByCoachId(req.user!.id);
      res.json(resources);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/resources/client", ensureClient, async (req, res, next) => {
    try {
      const resources = await storage.getVisibleResourcesForClient(req.user!.id);
      
      // Fetch coach details for each resource
      const resourcesWithCoachDetails = await Promise.all(
        resources.map(async (resource) => {
          const coach = await storage.getUser(resource.coachId);
          return {
            ...resource,
            coach: coach ? {
              id: coach.id,
              name: coach.name,
              email: coach.email,
              profilePicture: coach.profilePicture,
            } : null,
          };
        })
      );
      
      res.json(resourcesWithCoachDetails);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/resource-access", ensureCoach, async (req, res, next) => {
    try {
      const validatedData = insertResourceAccessSchema.parse(req.body);
      
      // Check if resource exists and belongs to the coach
      const resource = await storage.getResourceById(validatedData.resourceId);
      if (!resource || resource.coachId !== req.user!.id) {
        return res.status(404).json({ message: "Resource not found or not owned by this coach" });
      }
      
      // Check if client exists and is linked to this coach
      const link = await storage.getUserLink(req.user!.id, validatedData.clientId);
      if (!link) {
        return res.status(404).json({ message: "Client not linked to this coach" });
      }
      
      const resourceAccess = await storage.createResourceAccess(validatedData);
      res.status(201).json(resourceAccess);
    } catch (error) {
      next(error);
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
