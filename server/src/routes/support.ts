import express from 'express';
import { SupportService } from '../services/supportService';
import { isAuthenticated, isAdmin, hasRole } from '../middleware/auth';
import logger from '../utils/logger';

const router = express.Router();
const supportService = SupportService.getInstance();

/**
 * Public Routes (accessible to all authenticated users)
 */

// Submit support ticket
router.post('/tickets', isAuthenticated, async (req, res) => {
  try {
    const { subject, description, category, priority } = req.body;
    const user = req.user as any;

    if (!subject || !description) {
      return res.status(400).json({
        success: false,
        message: 'Subject and description are required'
      });
    }

    const ticket = await supportService.createSupportTicket({
      userId: user.id,
      userEmail: user.email,
      userName: user.name || `${user.firstName} ${user.lastName}`,
      subject,
      description,
      category: category || 'general',
      priority: priority || 'medium',
      tags: [],
      attachments: []
    });

    res.json({
      success: true,
      data: ticket,
      message: 'Support ticket created successfully'
    });
  } catch (error) {
    logger.error('Failed to create support ticket', { error, userId: req.user?.id });
    res.status(500).json({
      success: false,
      message: 'Failed to create support ticket'
    });
  }
});

// Get user's support tickets
router.get('/tickets/my', isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const allTickets = supportService.getSupportTickets();
    const userTickets = allTickets.filter(ticket => ticket.userId === user.id);

    res.json({
      success: true,
      data: userTickets,
      count: userTickets.length
    });
  } catch (error) {
    logger.error('Failed to get user tickets', { error, userId: req.user?.id });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve support tickets'
    });
  }
});

// Add message to support ticket
router.post('/tickets/:ticketId/messages', isAuthenticated, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { content } = req.body;
    const user = req.user as any;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required'
      });
    }

    // Verify user owns the ticket or is admin
    const allTickets = supportService.getSupportTickets();
    const ticket = allTickets.find(t => t.id === ticketId);
    
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    if (ticket.userId !== user.id && user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this ticket'
      });
    }

    const message = supportService.addTicketMessage(
      ticketId,
      user.id,
      user.name || `${user.firstName} ${user.lastName}`,
      content,
      true // fromUser
    );

    res.json({
      success: true,
      data: message,
      message: 'Message added successfully'
    });
  } catch (error) {
    logger.error('Failed to add ticket message', { error, ticketId: req.params.ticketId, userId: req.user?.id });
    res.status(500).json({
      success: false,
      message: 'Failed to add message to ticket'
    });
  }
});

// Submit user feedback
router.post('/feedback', isAuthenticated, async (req, res) => {
  try {
    const { type, rating, content, page } = req.body;
    const user = req.user as any;

    if (!type || !content) {
      return res.status(400).json({
        success: false,
        message: 'Type and content are required'
      });
    }

    const feedback = await supportService.submitUserFeedback({
      userId: user.id,
      userEmail: user.email,
      type,
      rating,
      content,
      page,
      userAgent: req.get('User-Agent'),
      sessionId: req.sessionID
    });

    res.json({
      success: true,
      data: feedback,
      message: 'Feedback submitted successfully'
    });
  } catch (error) {
    logger.error('Failed to submit feedback', { error, userId: req.user?.id });
    res.status(500).json({
      success: false,
      message: 'Failed to submit feedback'
    });
  }
});

// Get help articles
router.get('/help', async (req, res) => {
  try {
    const { category, search } = req.query;
    
    const articles = supportService.getHelpArticles({
      category: category as string,
      published: true,
      searchTerm: search as string
    });

    res.json({
      success: true,
      data: articles,
      count: articles.length
    });
  } catch (error) {
    logger.error('Failed to get help articles', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve help articles'
    });
  }
});

// Get specific help article
router.get('/help/:articleId', async (req, res) => {
  try {
    const { articleId } = req.params;
    const articles = supportService.getHelpArticles({ published: true });
    const article = articles.find(a => a.id === articleId || a.slug === articleId);

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    // Record article view
    supportService.recordArticleView(article.id);

    res.json({
      success: true,
      data: article
    });
  } catch (error) {
    logger.error('Failed to get help article', { error, articleId: req.params.articleId });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve help article'
    });
  }
});

// Rate help article
router.post('/help/:articleId/feedback', async (req, res) => {
  try {
    const { articleId } = req.params;
    const { helpful } = req.body;

    if (typeof helpful !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Helpful field must be a boolean'
      });
    }

    supportService.recordArticleFeedback(articleId, helpful);

    res.json({
      success: true,
      message: 'Feedback recorded successfully'
    });
  } catch (error) {
    logger.error('Failed to record article feedback', { error, articleId: req.params.articleId });
    res.status(500).json({
      success: false,
      message: 'Failed to record feedback'
    });
  }
});

/**
 * Admin Routes (admin access only)
 */

// Get all support tickets (admin only)
router.get('/admin/tickets', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { status, priority, category, limit } = req.query;
    
    const tickets = supportService.getSupportTickets({
      status: status as any,
      priority: priority as any,
      category: category as any,
      limit: limit ? parseInt(limit as string) : undefined
    });

    res.json({
      success: true,
      data: tickets,
      count: tickets.length
    });
  } catch (error) {
    logger.error('Failed to get all tickets', { error, adminId: req.user?.id });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve support tickets'
    });
  }
});

// Update ticket status (admin only)
router.patch('/admin/tickets/:ticketId/status', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { status } = req.body;
    const adminId = req.user?.id;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const ticket = await supportService.updateTicketStatus(ticketId, status, adminId);

    res.json({
      success: true,
      data: ticket,
      message: 'Ticket status updated successfully'
    });
  } catch (error) {
    logger.error('Failed to update ticket status', { error, ticketId: req.params.ticketId, adminId: req.user?.id });
    
    if (error.message === 'Ticket not found') {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update ticket status'
    });
  }
});

// Add admin message to ticket
router.post('/admin/tickets/:ticketId/messages', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { content } = req.body;
    const admin = req.user as any;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required'
      });
    }

    const message = supportService.addTicketMessage(
      ticketId,
      admin.id,
      admin.name || `${admin.firstName} ${admin.lastName}`,
      content,
      false // fromUser
    );

    res.json({
      success: true,
      data: message,
      message: 'Admin message added successfully'
    });
  } catch (error) {
    logger.error('Failed to add admin message', { error, ticketId: req.params.ticketId, adminId: req.user?.id });
    res.status(500).json({
      success: false,
      message: 'Failed to add message to ticket'
    });
  }
});

// Get all user feedback (admin only)
router.get('/admin/feedback', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { type, status, rating, limit } = req.query;
    
    const feedback = supportService.getUserFeedback({
      type: type as any,
      status: status as any,
      rating: rating ? parseInt(rating as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined
    });

    res.json({
      success: true,
      data: feedback,
      count: feedback.length
    });
  } catch (error) {
    logger.error('Failed to get feedback', { error, adminId: req.user?.id });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve feedback'
    });
  }
});

// Create help article (admin only)
router.post('/admin/help', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { title, slug, content, category, subcategory, tags, priority, isPublished } = req.body;
    const adminId = req.user?.id;

    if (!title || !content || !category) {
      return res.status(400).json({
        success: false,
        message: 'Title, content, and category are required'
      });
    }

    const article = supportService.createHelpArticle({
      title,
      slug: slug || title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, ''),
      content,
      category,
      subcategory,
      tags: tags || [],
      priority: priority || 10,
      isPublished: isPublished !== false,
      authorId: adminId || 'admin',
      relatedArticles: []
    });

    res.json({
      success: true,
      data: article,
      message: 'Help article created successfully'
    });
  } catch (error) {
    logger.error('Failed to create help article', { error, adminId: req.user?.id });
    res.status(500).json({
      success: false,
      message: 'Failed to create help article'
    });
  }
});

// Get admin notifications
router.get('/admin/notifications', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { type, severity, acknowledged, limit } = req.query;
    
    const notifications = supportService.getAdminNotifications({
      type: type as any,
      severity: severity as any,
      acknowledged: acknowledged === 'true',
      limit: limit ? parseInt(limit as string) : undefined
    });

    res.json({
      success: true,
      data: notifications,
      count: notifications.length
    });
  } catch (error) {
    logger.error('Failed to get admin notifications', { error, adminId: req.user?.id });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve notifications'
    });
  }
});

// Get support analytics (admin only)
router.get('/admin/analytics', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const analytics = supportService.getSupportAnalytics();

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('Failed to get support analytics', { error, adminId: req.user?.id });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve support analytics'
    });
  }
});

export default router; 