import express from 'express';
import { isAuthenticated, isCoach } from '../middleware/auth.js';
import { coachNoteController } from '../controllers/coachNoteController.js';
import { validateBody, validateParams, validateQuery, validateMultiple } from '../middleware/validate.js';
import { validationSchemas } from '../schemas/validation.js';

const router = express.Router();

// Create a new coach note
router.post('/', 
  isAuthenticated, 
  validateBody(validationSchemas.coachNote.create),
  coachNoteController.createCoachNote
);

// Get a specific coach note
router.get('/:id', 
  isAuthenticated, 
  validateParams(validationSchemas.coachNote.params),
  coachNoteController.getCoachNote
);

// Get all coach notes for a session
router.get('/session/:sessionId', 
  isAuthenticated, 
  validateParams(validationSchemas.session.params),
  coachNoteController.getSessionCoachNotes
);

// Get all coach notes for the current coach
router.get('/', 
  isAuthenticated, 
  validateQuery(validationSchemas.coachNote.query),
  coachNoteController.getCoachNotes
);

// Update a coach note
router.put('/:id', 
  isAuthenticated, 
  validateMultiple({
    params: validationSchemas.coachNote.params,
    body: validationSchemas.coachNote.update
  }),
  coachNoteController.updateCoachNote
);

// Delete a coach note
router.delete('/:id', 
  isAuthenticated, 
  validateParams(validationSchemas.coachNote.params),
  coachNoteController.deleteCoachNote
);

// Share a coach note with other users
router.post('/:id/share', 
  isAuthenticated, 
  validateMultiple({
    params: validationSchemas.coachNote.params,
    body: validationSchemas.coachNote.share
  }),
  coachNoteController.shareCoachNote
);

router.post('/:id/unshare', 
  isAuthenticated, 
  validateParams(validationSchemas.coachNote.params),
  coachNoteController.unshareCoachNote
);

// Get audit trail for a coach note
router.get(
  '/:id/audit',
  isAuthenticated,
  validateParams(validationSchemas.coachNote.params),
  coachNoteController.getAuditTrail
);

// Search coach notes with full-text search and filtering
router.get(
  '/search',
  isAuthenticated,
  validateQuery(validationSchemas.search.coachNotes.shape.query),
  coachNoteController.searchCoachNotes
);

// Get search suggestions for coach notes
router.get(
  '/search/suggestions',
  isAuthenticated,
  validateQuery(validationSchemas.search.suggestions.shape.query),
  coachNoteController.getSearchSuggestions
);

// Get popular tags for coach notes
router.get(
  '/search/tags',
  isAuthenticated,
  validateQuery(validationSchemas.search.popularTags.shape.query),
  coachNoteController.getPopularTags
);

export default router; 