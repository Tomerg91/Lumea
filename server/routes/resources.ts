import express, { Request, Response, NextFunction } from 'express';
// import { PrismaClient } from '@prisma/client'; // Removed for mock
// import { isAuthenticated, isCoach } from '../middleware/authMiddleware'; // Removed for mock
// import { AuthenticatedUser } from '../config/passport'; // Removed for mock

const router = express.Router();
// const prisma = new PrismaClient(); // Removed for mock

// Mock Resource Data
const mockResources = [
    { id: 'res1', title: 'Welcome Guide (Mock)', type: 'PDF', createdAt: new Date(Date.now() - 2 * 86400000).toISOString(), content: 'Welcome_Guide_Mock.pdf' },
    { id: 'res2', title: 'Goal Setting Worksheet (Mock)', type: 'DOCUMENT', createdAt: new Date(Date.now() - 1 * 86400000).toISOString(), content: 'Goal_Setting_Mock.docx' },
    { id: 'res3', title: 'Intro Video (Mock)', type: 'VIDEO', createdAt: new Date().toISOString(), content: 'Intro_Video_Mock.mp4' },
];

// --- Resource Routes (Accessed via /api/resources) ---

// GET /api/resources/coach - Mock: Get all resources (same as client for simplicity)
router.get('/coach', /* isAuthenticated, isCoach, */ (req: Request, res: Response, next: NextFunction) => {
    console.log("Mock GET /resources/coach hit");
    res.status(200).json(mockResources);
});

// GET /api/resources/client - Mock: Get all resources (same as coach for simplicity)
router.get('/client', /* isAuthenticated, */ (req: Request, res: Response, next: NextFunction) => {
    // const userId = (req.user as AuthenticatedUser).id; // No user info needed for mock
    console.log("Mock GET /resources/client hit");
    res.status(200).json(mockResources);
});

// --- Placeholder for other resource routes ---

// POST /api/resources - Mock: Create a new resource
router.post('/', /* isAuthenticated, isCoach, validation, */ (req: Request, res: Response) => {
    console.log("Mock POST /resources hit with body:", req.body);
    const { title, type, content } = req.body;
    if (!title || !type || !content) {
        return res.status(400).json({ message: "Mock requires title, type, and content" });
    }
    const newResource = {
        id: 'newMockRes' + Date.now(),
        title: title,
        type: type.toUpperCase(),
        content: content,
        createdAt: new Date().toISOString(),
    };
    // In a real scenario, you might want to add this to a temporary in-memory list
    // For now, just return the created object
    res.status(201).json(newResource);
});

// PUT /api/resources/:resourceId - Mock: Update a resource
router.put('/:resourceId', /* isAuthenticated, isCoach, validation, */ (req: Request, res: Response) => {
    const resourceId = req.params.resourceId;
    console.log(`Mock PUT /resources/${resourceId} hit with body:`, req.body);
    res.json({ message: `OK (Mock Update for resource ${resourceId})`, data: req.body });
});

// DELETE /api/resources/:resourceId - Mock: Delete a resource
router.delete('/:resourceId', /* isAuthenticated, isCoach, */ (req: Request, res: Response) => {
    const resourceId = req.params.resourceId;
    console.log(`Mock DELETE /resources/${resourceId} hit`);
    res.status(200).json({ message: `OK (Mock Delete for resource ${resourceId})` });
});

// POST /api/resources/assign - Mock: Assign a resource to a user
router.post('/assign', /* isAuthenticated, isCoach, validation, */ (req: Request, res: Response) => {
    const { userId, resourceId } = req.body;
    console.log(`Mock POST /resources/assign hit: Assign resource ${resourceId} to user ${userId}`);
    if (!userId || !resourceId) {
        return res.status(400).json({ message: "Mock requires userId and resourceId" });
    }
    res.status(201).json({ message: `Mock assigned resource ${resourceId} to user ${userId}` });
});

// DELETE /api/resources/unassign - Mock: Unassign a resource from a user
router.delete('/unassign', /* isAuthenticated, isCoach, validation, */ (req: Request, res: Response) => {
    // Assuming body contains userId and resourceId for unassignment
    const { userId, resourceId } = req.body;
    console.log(`Mock DELETE /resources/unassign hit: Unassign resource ${resourceId} from user ${userId}`);
     if (!userId || !resourceId) {
        return res.status(400).json({ message: "Mock requires userId and resourceId" });
    }
    res.status(200).json({ message: `Mock unassigned resource ${resourceId} from user ${userId}` });
});


export default router; 