import express from 'express';
import { reflectionController } from '../controllers/reflectionController.js';
import { ReflectionTemplates } from '../models/ReflectionTemplate.js';
import { isAuthenticated } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication middleware to all reflection routes
router.use(isAuthenticated);

// Routes for reflection forms and management
// GET /api/reflections/templates - Get available reflection templates
router.get('/templates', (req, res) => {
  try {
    const templates = ReflectionTemplates.getAvailableTemplates();
    res.json({ templates });
  } catch (error) {
    console.error('Error getting reflection templates:', error);
    res.status(500).json({ error: 'Failed to get reflection templates' });
  }
});

// GET /api/reflections/form/:sessionId - Get reflection form template for a session
router.get('/form/:sessionId', reflectionController.getReflectionForm);

// GET /api/reflections/:sessionId - Get existing reflection for a session
router.get('/:sessionId', reflectionController.getReflection);

// POST /api/reflections/:sessionId - Save/create reflection for a session
router.post('/:sessionId', reflectionController.saveReflection);

// PUT /api/reflections/:sessionId - Update reflection for a session (same as POST)
router.put('/:sessionId', reflectionController.saveReflection);

// DELETE /api/reflections/:sessionId - Delete reflection for a session
router.delete('/:sessionId', reflectionController.deleteReflection);

// GET /api/reflections/client/all - Get all reflections for a client
router.get('/client/all', reflectionController.getClientReflections);

// GET /api/reflections/coach/all - Get all reflections for a coach (submitted only)
router.get('/coach/all', reflectionController.getCoachReflections);

// NEW REFLECTION HISTORY AND ANALYTICS ROUTES

// GET /api/reflections/history - Get reflection history with advanced filtering
router.get('/history', reflectionController.getReflectionHistory);

// GET /api/reflections/analytics - Get reflection analytics and insights
router.get('/analytics', reflectionController.getReflectionAnalytics);

// GET /api/reflections/search - Search reflections with full-text capabilities
router.get('/search', reflectionController.searchReflections);

export default router;
