import { Request, Response } from 'express';
import { z } from 'zod';
import {
  createCoachNote,
  updateCoachNote,
  getCoachNoteById,
  getCoachNotesBySession,
  getCoachNotesByCoach,
  deleteCoachNote,
} from '../storage.js';
import { Session } from '../models/Session.js';
import { ICoachNote, AuditAction, NoteAccessLevel } from '../models/CoachNote.js';
import { validationSchemas } from '../schemas/validation.js';
import { APIError, ErrorCode } from '../middleware/error.js';
import CoachNoteSearchService from '../services/searchService.js';
import { applyMask, FieldMaskRule } from '../utils/dataMasking.js';

// Helper function to get client IP
const getClientIp = (req: Request): string => {
  return (req.headers['x-forwarded-for'] as string) || 
         (req.headers['x-real-ip'] as string) || 
         req.socket.remoteAddress || 
         'unknown';
};

// Helper function to check note access with audit trail
const checkNoteAccess = async (
  note: ICoachNote,
  userId: string,
  userRole: string,
  action: AuditAction,
  req: Request
): Promise<boolean> => {
  try {
    // Log the access attempt
    const auditEntry: any = {
      action,
      userId,
      userRole,
      timestamp: new Date(),
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      details: { noteId: note._id.toString(), reasonForAccess: (req as any).accessReason }
    };

    // Check access based on privacy settings
    const hasAccess = await note.checkAccess(userId, userRole);
    
    if (!hasAccess) {
      // Log denied access
      note.auditTrail.push({
        ...auditEntry,
        details: { ...auditEntry.details, accessDenied: true, reason: 'Insufficient permissions' }
      });
      await note.save();
      return false;
    }

    // Log successful access
    note.auditTrail.push(auditEntry);
    await note.save();

    return true;
  } catch (error) {
    console.error('Error checking note access:', error);
    return false;
  }
};

// ---------------------------------------
// Masking helper
// ---------------------------------------
function maskNoteForUser(note: ICoachNote, user: { id: string; role: string }) {
  const isOwner = note.coachId.toString() === user.id;
  const isAdmin = user.role === 'admin';
  if (isOwner || isAdmin) {
    return note.toSafeObject();
  }

  const rules: FieldMaskRule[] = [
    { path: 'textContent', strategy: 'redact' },
    { path: 'searchableContent', strategy: 'redact' },
    { path: 'audioFileId', strategy: 'redact' },
  ];

  return applyMask(note.toSafeObject(), rules);
}

export const coachNoteController = {
  // Create a new coach note
  async createCoachNote(req: Request, res: Response) {
    try {
      if (!req.user) {
        throw APIError.unauthorized('Authentication required');
      }

      // Validation is handled by middleware using validationSchemas.coachNote.create
      const validatedData = req.body;

      // Verify session exists and user has access
      const session = await Session.findById(validatedData.sessionId);
      if (!session) {
        throw APIError.notFound('Session');
      }

      // Check if user is authorized to create notes for this session
      if (session.coachId.toString() !== req.user.id && req.user.role !== 'admin') {
        throw APIError.forbidden('Not authorized to create notes for this session');
      }

      const coachNote = await createCoachNote(validatedData, req.user.id);
      
      // Log creation in audit trail
      coachNote.auditTrail.push({
        action: AuditAction.CREATED,
        userId: req.user.id,
        userRole: req.user.role,
        timestamp: new Date(),
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent'] || 'unknown',
        details: { noteId: coachNote._id.toString() }
      });
      await coachNote.save();

      res.status(201).json({
        message: 'Coach note created successfully',
        note: maskNoteForUser(coachNote, req.user)
      });
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      console.error('Error creating coach note:', error);
      throw new APIError(ErrorCode.INTERNAL_ERROR, 'Failed to create coach note', 500);
    }
  },

  // Get a specific coach note
  async getCoachNote(req: Request, res: Response) {
    try {
      if (!req.user) {
        throw APIError.unauthorized('Authentication required');
      }

      // Validation is handled by middleware using validationSchemas.coachNote.params
      const { id } = req.params;

      const coachNote = await getCoachNoteById(id);
      if (!coachNote) {
        throw APIError.notFound('Coach note');
      }

      // Check access permissions
      const hasAccess = await checkNoteAccess(
        coachNote,
        req.user.id,
        req.user.role,
        AuditAction.VIEWED,
        req
      );

      if (!hasAccess) {
        throw APIError.forbidden('Not authorized to view this note');
      }

      res.json({
        note: maskNoteForUser(coachNote, req.user),
        auditTrail: coachNote.auditTrail.slice(-10) // Last 10 audit entries
      });
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      console.error('Error getting coach note:', error);
      throw new APIError(ErrorCode.INTERNAL_ERROR, 'Failed to get coach note', 500);
    }
  },

  // Get all coach notes for a session
  async getSessionCoachNotes(req: Request, res: Response) {
    try {
      if (!req.user) {
        throw APIError.unauthorized('Authentication required');
      }

      // Validation is handled by middleware
      const { sessionId } = req.params;

      // Verify session exists and user has access
      const session = await Session.findById(sessionId);
      if (!session) {
        throw APIError.notFound('Session');
      }

      // Check if user is authorized to view notes for this session
      if (session.coachId.toString() !== req.user.id && 
          session.clientId.toString() !== req.user.id && 
          req.user.role !== 'admin') {
        throw APIError.forbidden('Not authorized to view notes for this session');
      }

      const coachNotes = await getCoachNotesBySession(sessionId);
      
      // Filter notes based on access permissions and convert to safe objects
      const accessibleNotes = [];
      for (const note of coachNotes) {
        const hasAccess = await checkNoteAccess(
          note,
          req.user.id,
          req.user.role,
          AuditAction.VIEWED,
          req
        );
        
        if (hasAccess) {
          accessibleNotes.push(maskNoteForUser(note, req.user));
        }
      }

      res.json({
        notes: accessibleNotes,
        total: accessibleNotes.length,
        sessionId
      });
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      console.error('Error getting session coach notes:', error);
      throw new APIError(ErrorCode.INTERNAL_ERROR, 'Failed to get session coach notes', 500);
    }
  },

  // Get all coach notes for the current coach
  async getCoachNotes(req: Request, res: Response) {
    try {
      if (!req.user) {
        throw APIError.unauthorized('Authentication required');
      }

      // Validation is handled by middleware using validationSchemas.coachNote.query
      const queryParams = req.query;

      const coachNotes = await getCoachNotesByCoach(req.user.id);
      
      // Apply filters and convert to safe objects
      let filteredNotes = coachNotes;
      
      // Filter by session if specified
      if (queryParams.sessionId) {
        filteredNotes = filteredNotes.filter(note => 
          note.sessionId.toString() === queryParams.sessionId
        );
      }

      // Filter by access level if specified
      if (queryParams.accessLevel) {
        filteredNotes = filteredNotes.filter(note => 
          note.privacySettings.accessLevel === queryParams.accessLevel
        );
      }

      // Apply search if specified
      if (queryParams.search) {
        const searchTerm = String(queryParams.search).toLowerCase();
        filteredNotes = filteredNotes.filter(note => 
          note.title?.toLowerCase().includes(searchTerm) ||
          note.textContent.toLowerCase().includes(searchTerm) ||
          note.tags.some(tag => tag.toLowerCase().includes(searchTerm))
        );
      }

      // Apply pagination
      const page = Number(queryParams.page) || 1;
      const limit = Number(queryParams.limit) || 10;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;

      const paginatedNotes = filteredNotes.slice(startIndex, endIndex);
      const safeNotes = paginatedNotes.map(note => maskNoteForUser(note, req.user));

      res.json({
        notes: safeNotes,
        pagination: {
          page,
          limit,
          total: filteredNotes.length,
          pages: Math.ceil(filteredNotes.length / limit)
        }
      });
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      console.error('Error getting coach notes:', error);
      throw new APIError(ErrorCode.INTERNAL_ERROR, 'Failed to get coach notes', 500);
    }
  },

  // Update a coach note
  async updateCoachNote(req: Request, res: Response) {
    try {
      if (!req.user) {
        throw APIError.unauthorized('Authentication required');
      }

      // Validation is handled by middleware
      const { id } = req.params;
      const validatedData = req.body;

      const coachNote = await getCoachNoteById(id);
      if (!coachNote) {
        throw APIError.notFound('Coach note');
      }

      // Check if user is authorized to update this note
      if (coachNote.coachId.toString() !== req.user.id && req.user.role !== 'admin') {
        throw APIError.forbidden('Not authorized to update this note');
      }

      const updatedNote = await updateCoachNote(id, validatedData);
      if (!updatedNote) {
        throw APIError.notFound('Coach note');
      }

      // Log update in audit trail
      updatedNote.auditTrail.push({
        action: AuditAction.UPDATED,
        userId: req.user.id,
        userRole: req.user.role,
        timestamp: new Date(),
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent'] || 'unknown',
        details: { 
          noteId: updatedNote._id.toString(),
          changes: Object.keys(validatedData)
        }
      });
      await updatedNote.save();

      res.json({
        message: 'Coach note updated successfully',
        note: maskNoteForUser(updatedNote, req.user)
      });
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      console.error('Error updating coach note:', error);
      throw new APIError(ErrorCode.INTERNAL_ERROR, 'Failed to update coach note', 500);
    }
  },

  // Delete a coach note
  async deleteCoachNote(req: Request, res: Response) {
    try {
      if (!req.user) {
        throw APIError.unauthorized('Authentication required');
      }

      // Validation is handled by middleware
      const { id } = req.params;

      const coachNote = await getCoachNoteById(id);
      if (!coachNote) {
        throw APIError.notFound('Coach note');
      }

      // Check if user is authorized to delete this note
      if (coachNote.coachId.toString() !== req.user.id && req.user.role !== 'admin') {
        throw APIError.forbidden('Not authorized to delete this note');
      }

      // Log deletion in audit trail before deleting
      coachNote.auditTrail.push({
        action: AuditAction.DELETED,
        userId: req.user.id,
        userRole: req.user.role,
        timestamp: new Date(),
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent'] || 'unknown',
        details: { noteId: coachNote._id.toString() }
      });
      await coachNote.save();

      await deleteCoachNote(id);

      res.json({
        message: 'Coach note deleted successfully'
      });
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      console.error('Error deleting coach note:', error);
      throw new APIError(ErrorCode.INTERNAL_ERROR, 'Failed to delete coach note', 500);
    }
  },

  // Share a coach note with other users
  async shareCoachNote(req: Request, res: Response) {
    try {
      if (!req.user) {
        throw APIError.unauthorized('Authentication required');
      }

      // Validation is handled by middleware using validationSchemas.coachNote.share
      const { id } = req.params;
      const { userIds, reason } = req.body;

      const coachNote = await getCoachNoteById(id);
      if (!coachNote) {
        throw APIError.notFound('Coach note');
      }

      // Check if user is authorized to share this note
      if (coachNote.coachId.toString() !== req.user.id && req.user.role !== 'admin') {
        throw APIError.forbidden('Not authorized to share this note');
      }

      // Check if sharing is allowed by privacy settings
      if (!coachNote.privacySettings.allowSharing) {
        throw APIError.forbidden('Sharing is not allowed for this note');
      }

      // Add users to shared list
      const newSharedUsers = userIds.filter((userId: string) => 
        !coachNote.sharedWith.includes(userId)
      );
      coachNote.sharedWith.push(...newSharedUsers);

      // Log sharing in audit trail
      coachNote.auditTrail.push({
        action: AuditAction.SHARED,
        userId: req.user.id,
        userRole: req.user.role,
        timestamp: new Date(),
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent'] || 'unknown',
        details: { 
          noteId: coachNote._id.toString(),
          sharedWith: newSharedUsers,
          reason
        }
      });

      await coachNote.save();

      res.json({
        message: 'Coach note shared successfully',
        sharedWith: coachNote.sharedWith
      });
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      console.error('Error sharing coach note:', error);
      throw new APIError(ErrorCode.INTERNAL_ERROR, 'Failed to share coach note', 500);
    }
  },

  // Unshare a coach note
  async unshareCoachNote(req: Request, res: Response) {
    try {
      if (!req.user) {
        throw APIError.unauthorized('Authentication required');
      }

      const { id } = req.params;
      const { userIds } = req.body;

      const coachNote = await getCoachNoteById(id);
      if (!coachNote) {
        throw APIError.notFound('Coach note');
      }

      // Check if user is authorized to unshare this note
      if (coachNote.coachId.toString() !== req.user.id && req.user.role !== 'admin') {
        throw APIError.forbidden('Not authorized to unshare this note');
      }

      // Remove users from shared list
      coachNote.sharedWith = coachNote.sharedWith.filter(userId => 
        !userIds.includes(userId)
      );

      // Log unsharing in audit trail
      coachNote.auditTrail.push({
        action: AuditAction.UNSHARED,
        userId: req.user.id,
        userRole: req.user.role,
        timestamp: new Date(),
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent'] || 'unknown',
        details: { 
          noteId: coachNote._id.toString(),
          unsharedWith: userIds
        }
      });

      await coachNote.save();

      res.json({
        message: 'Coach note unshared successfully',
        sharedWith: coachNote.sharedWith
      });
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      console.error('Error unsharing coach note:', error);
      throw new APIError(ErrorCode.INTERNAL_ERROR, 'Failed to unshare coach note', 500);
    }
  },

  // Get audit trail for a coach note
  async getAuditTrail(req: Request, res: Response) {
    try {
      if (!req.user) {
        throw APIError.unauthorized('Authentication required');
      }

      const { id } = req.params;

      const coachNote = await getCoachNoteById(id);
      if (!coachNote) {
        throw APIError.notFound('Coach note');
      }

      // Check if user is authorized to view audit trail
      if (coachNote.coachId.toString() !== req.user.id && req.user.role !== 'admin') {
        throw APIError.forbidden('Not authorized to view audit trail for this note');
      }

      res.json({
        auditTrail: coachNote.auditTrail
      });
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      console.error('Error getting audit trail:', error);
      throw new APIError(ErrorCode.INTERNAL_ERROR, 'Failed to get audit trail', 500);
    }
  },

  // Search coach notes with full-text search and filtering
  async searchCoachNotes(req: Request, res: Response) {
    try {
      if (!req.user) {
        throw APIError.unauthorized('Authentication required');
      }

      // Validation is handled by middleware
      const {
        query,
        tags,
        accessLevel,
        dateStart,
        dateEnd,
        coachId,
        sessionId,
        page = 1,
        limit = 20,
        sortBy = 'relevance',
        sortOrder = 'desc'
      } = req.query;

      // Build search options
      const searchOptions = {
        query: query as string,
        tags: tags ? (Array.isArray(tags) ? tags : [tags]) as string[] : undefined,
        accessLevel: accessLevel ? (Array.isArray(accessLevel) ? accessLevel : [accessLevel]) as NoteAccessLevel[] : undefined,
        dateRange: (dateStart || dateEnd) ? {
          start: dateStart ? new Date(dateStart as string) : undefined,
          end: dateEnd ? new Date(dateEnd as string) : undefined
        } : undefined,
        coachId: coachId as string,
        sessionId: sessionId as string,
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
        sortBy: sortBy as 'relevance' | 'date' | 'title' | 'lastAccess',
        sortOrder: sortOrder as 'asc' | 'desc'
      };

      const searchResult = await CoachNoteSearchService.searchNotes({
        userId: req.user.id,
        userRole: req.user.role,
        options: searchOptions
      });

      // Decrypt notes for display
      const decryptedNotes = searchResult.notes.map(note => {
        const safeNote = maskNoteForUser(note, req.user);
        // Decrypt content if user has access
        if (note.isEncrypted) {
          safeNote.textContent = note.decryptText();
        }
        return safeNote;
      });

      res.json({
        notes: decryptedNotes,
        pagination: {
          page: searchResult.page,
          limit: searchOptions.limit,
          totalCount: searchResult.totalCount,
          totalPages: searchResult.totalPages
        },
        metadata: searchResult.searchMetadata
      });
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      console.error('Error searching coach notes:', error);
      throw new APIError(ErrorCode.INTERNAL_ERROR, 'Failed to search coach notes', 500);
    }
  },

  // Get search suggestions for coach notes
  async getSearchSuggestions(req: Request, res: Response) {
    try {
      if (!req.user) {
        throw APIError.unauthorized('Authentication required');
      }

      const { query, limit = 10 } = req.query;

      if (!query || typeof query !== 'string') {
        res.json({ suggestions: [] });
        return;
      }

      const suggestions = await CoachNoteSearchService.getSearchSuggestions(
        req.user.id,
        req.user.role,
        query,
        parseInt(limit as string, 10)
      );

      res.json({
        suggestions
      });
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      console.error('Error getting search suggestions:', error);
      throw new APIError(ErrorCode.INTERNAL_ERROR, 'Failed to get search suggestions', 500);
    }
  },

  // Get popular tags for coach notes
  async getPopularTags(req: Request, res: Response) {
    try {
      if (!req.user) {
        throw APIError.unauthorized('Authentication required');
      }

      const { limit = 20 } = req.query;

      const tags = await CoachNoteSearchService.getPopularTags(
        req.user.id,
        req.user.role,
        parseInt(limit as string, 10)
      );

      res.json({
        tags
      });
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      console.error('Error getting popular tags:', error);
      throw new APIError(ErrorCode.INTERNAL_ERROR, 'Failed to get popular tags', 500);
    }
  }
};
