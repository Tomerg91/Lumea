import express, { Request, Response, NextFunction } from 'express';
// import { PrismaClient } from '@prisma/client'; // Removed for mock
// import { isAuthenticated, isCoach } from '../middleware/authMiddleware'; // Removed for mock
// import { AuthenticatedUser } from '../config/passport'; // Removed for mock
// import { body, validationResult } from 'express-validator'; // Removed for mock

const router = express.Router();
// const prisma = new PrismaClient(); // Removed for mock

// Validation middleware - Removed
// const validate = ...;

// Mock Session Data
const mockSessions = [
    {
        id: 'sess1',
        clientId: 'client1', // Refers to mock client alpha
        coachId: 'mockCoach1', // Refers to mock coach
        date: new Date(Date.now() + 86400000 * 2).toISOString(), // Two days from now
        status: 'Upcoming',
        notes: 'Mock session notes for Alpha',
        client: { id: 'client1', name: 'Mock Client Alpha', email: 'alpha@test.com' },
        coach: { id: 'mockCoach1', name: 'Mock Coach', email: 'coach@example.com' }
    },
    {
        id: 'sess2',
        clientId: 'client2', // Refers to mock client beta
        coachId: 'mockCoach1', // Refers to mock coach
        date: new Date(Date.now() - 86400000 * 7).toISOString(), // One week ago
        status: 'Completed',
        notes: 'Mock session notes for Beta - completed',
        client: { id: 'client2', name: 'Mock Client Beta', email: 'beta@test.com' },
        coach: { id: 'mockCoach1', name: 'Mock Coach', email: 'coach@example.com' }
    },
];

// --- Session Routes (Accessed via /api/sessions) ---

// GET /api/sessions/coach - Mock: Get sessions for the coach
router.get('/coach', /* isAuthenticated, isCoach, */ (req: Request, res: Response, next: NextFunction) => {
    // const coachId = (req.user as AuthenticatedUser).id; // No user context needed
    console.log("Mock GET /sessions/coach hit");
    // Return all mock sessions for the coach view
    res.status(200).json(mockSessions);
});

// GET /api/sessions/client - Mock: Get sessions for a client
router.get('/client', /* isAuthenticated, */ (req: Request, res: Response, next: NextFunction) => {
    // const clientId = (req.user as AuthenticatedUser).id; // No user context needed
    console.log("Mock GET /sessions/client hit");
    // For simplicity, returning all sessions. A real mock might filter by a simulated logged-in client.
    res.status(200).json(mockSessions);
});

// POST /api/sessions - Mock: Create a new session
// const sessionCreationValidation = [...]; // Validation removed
router.post('/', /* isAuthenticated, isCoach, sessionCreationValidation, validate, */ (req: Request, res: Response, next: NextFunction) => {
    // const coachId = (req.user as AuthenticatedUser).id; // No user context needed
    console.log("Mock POST /sessions hit with body:", req.body);
    const { clientId, date, status, notes } = req.body;

    // Basic validation simulation
    if (!clientId || !date) {
        return res.status(400).json({ message: "Mock requires clientId and date" });
    }

    const newSession = {
        id: 'newMockSess' + Date.now(),
        coachId: 'mockCoach1', // Assume created by the mock coach
        clientId: clientId,
        date: date, // Assuming valid ISO string is passed
        status: status || 'Upcoming',
        notes: notes || null,
        // Include mock client/coach details based on clientId (or use generic)
        client: { id: clientId, name: `Mock Client (${clientId})`, email: `client-${clientId}@test.com` },
        coach: { id: 'mockCoach1', name: 'Mock Coach', email: 'coach@example.com' }
    };

    // In a real mock, you might add this to an in-memory list
    res.status(201).json(newSession);
});

// --- Placeholder for other session routes ---

// GET /api/sessions/:sessionId - Mock: Get details of a specific session
router.get('/:sessionId', /* isAuthenticated, */ (req: Request, res: Response) => {
    const sessionId = req.params.sessionId;
    console.log(`Mock GET /sessions/${sessionId} hit`);
    const session = mockSessions.find(s => s.id === sessionId);
    if (session) {
        res.status(200).json(session);
    } else {
        res.status(404).json({ message: `Mock Session ${sessionId} not found` });
    }
});

// PUT /api/sessions/:sessionId - Mock: Update a session
router.put('/:sessionId', /* isAuthenticated, isCoach, validation, */ (req: Request, res: Response) => {
    const sessionId = req.params.sessionId;
    console.log(`Mock PUT /sessions/${sessionId} hit with body:`, req.body);
    // Basic check for update data
    if (Object.keys(req.body).length === 0) {
        return res.status(400).json({ message: "Mock requires data for update" });
    }
    res.json({ message: `OK (Mock Update for session ${sessionId})`, data: req.body });
});

// DELETE /api/sessions/:sessionId - Mock: Delete a session
router.delete('/:sessionId', /* isAuthenticated, isCoach, */ (req: Request, res: Response) => {
    const sessionId = req.params.sessionId;
    console.log(`Mock DELETE /sessions/${sessionId} hit`);
    res.status(200).json({ message: `OK (Mock Delete for session ${sessionId})` });
});


export default router; 