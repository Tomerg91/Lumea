import express, { Request, Response, NextFunction } from 'express';
// import { PrismaClient } from '@prisma/client'; // Removed for mock
// import bcrypt from 'bcrypt'; // Removed for mock
// import { body, validationResult } from 'express-validator'; // Removed for mock
// import { isAuthenticated, isCoach } from '../middleware/authMiddleware'; // Removed for mock
// import { AuthenticatedUser } from '../config/passport'; // Removed for mock

const router = express.Router();
// const prisma = new PrismaClient(); // Removed for mock
// const saltRounds = 10; // Removed for mock

// Middleware to handle validation results - Removed
// const validate = ...;

// Validation rules for client creation - Removed
// const clientCreationValidationRules = ...;

// --- Client Management Routes (Accessed via /api/coach/clients) ---

// GET /coach/clients - Mock: Fetch all clients associated with the logged-in coach
router.get(
  '/',
  /* isAuthenticated, isCoach, */ (req: Request, res: Response, next: NextFunction) => {
    console.log('Mock GET /coach/clients hit');
    // Return a static list of mock clients
    res.json([
      {
        id: 'client1',
        name: 'Mock Client Alpha',
        email: 'alpha@test.com',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      }, // Yesterday
      {
        id: 'client2',
        name: 'Mock Client Beta',
        email: 'beta@test.com',
        createdAt: new Date().toISOString(),
      }, // Today
    ]);
  }
);

// POST /coach/clients - Mock: Create a new client (User with role CLIENT)
router.post(
  '/',
  /* isAuthenticated, isCoach, clientCreationValidationRules, validate, */ (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    console.log('Mock POST /coach/clients hit with body:', req.body);
    const { email, name, password } = req.body;
    // Basic validation simulation
    if (!email || !name || !password) {
      return res.status(400).json({ message: 'Mock requires email, name, and password' });
    }
    // Return a static success object with generated ID
    res.status(201).json({
      id: 'newMockClient' + Date.now(),
      name: name,
      email: email,
      createdAt: new Date().toISOString(),
      role: 'CLIENT', // Explicitly return role
    });
  }
);

// --- Placeholder for other client routes (PUT, DELETE, GET /:id) ---

// Mock PUT /coach/clients/:clientId
router.put(
  '/:clientId',
  /* isAuthenticated, isCoach, ... */ (req: Request, res: Response) => {
    console.log(`Mock PUT /coach/clients/${req.params.clientId} hit with body:`, req.body);
    // Check if essential fields are present in mock update
    if (!req.body.name && !req.body.email) {
      return res.status(400).json({ message: 'Mock requires name or email for update' });
    }
    res.json({ message: `OK (Mock Update for ${req.params.clientId})`, data: req.body });
  }
);

// Mock DELETE /coach/clients/:clientId
router.delete(
  '/:clientId',
  /* isAuthenticated, isCoach, ... */ (req: Request, res: Response) => {
    console.log(`Mock DELETE /coach/clients/${req.params.clientId} hit`);
    res.status(200).json({ message: `OK (Mock Delete for ${req.params.clientId})` }); // 200 with message is often better than 204 for DX
    // Alternatively: res.status(204).send();
  }
);

// Mock GET /coach/clients/:clientId - Add a basic mock for fetching a single client
router.get(
  '/:clientId',
  /* isAuthenticated, isCoach, ... */ (req: Request, res: Response) => {
    const clientId = req.params.clientId;
    console.log(`Mock GET /coach/clients/${clientId} hit`);
    // Find if the mock client exists in our static list example
    if (clientId === 'client1' || clientId === 'client2') {
      res.json({
        id: clientId,
        name: clientId === 'client1' ? 'Mock Client Alpha' : 'Mock Client Beta',
        email: clientId === 'client1' ? 'alpha@test.com' : 'beta@test.com',
        createdAt: new Date().toISOString(),
        role: 'CLIENT',
      });
    } else {
      res.status(404).json({ message: `Mock Client ${clientId} not found` });
    }
  }
);

export default router;
