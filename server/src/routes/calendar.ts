import express from 'express';
import { PrismaClient } from '@prisma/client';
import { CalendarManager, CalendarConnectionRequest, CalendarSyncOptions } from '../services/calendar/CalendarManager';
import { CalendarProvider } from '../services/calendar/CalendarService';
import { authenticate } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();
const calendarManager = new CalendarManager(prisma);

// Apply authentication middleware to all calendar routes
router.use(authenticate);

// Get OAuth authorization URL
router.get('/auth/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!['google', 'microsoft', 'apple'].includes(provider)) {
      return res.status(400).json({ error: 'Invalid calendar provider' });
    }

    const redirectUri = `${process.env.CLIENT_URL}/calendar/callback/${provider}`;
    const authUrl = await calendarManager.getAuthUrl(userId, provider as CalendarProvider, redirectUri);

    res.json({ authUrl, provider, redirectUri });
  } catch (error) {
    console.error('Calendar auth URL error:', error);
    res.status(500).json({ 
      error: 'Failed to generate authorization URL',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Handle OAuth callback and connect calendar
router.post('/connect', async (req, res) => {
  try {
    const { provider, code, redirectUri, calendarId, calendarName } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!provider || !code || !redirectUri) {
      return res.status(400).json({ 
        error: 'Missing required fields: provider, code, redirectUri' 
      });
    }

    const connectionRequest: CalendarConnectionRequest = {
      userId,
      provider,
      code,
      redirectUri,
      calendarId,
      calendarName
    };

    const integration = await calendarManager.connectCalendar(connectionRequest);

    res.json({
      success: true,
      integration: {
        id: integration.id,
        provider: integration.provider,
        calendarName: integration.calendarName,
        isActive: integration.isActive,
        syncEnabled: integration.syncEnabled,
        lastSyncAt: integration.lastSyncAt,
        createdAt: integration.createdAt
      }
    });
  } catch (error) {
    console.error('Calendar connection error:', error);
    res.status(500).json({ 
      error: 'Failed to connect calendar',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Disconnect calendar
router.delete('/disconnect/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!['google', 'microsoft', 'apple'].includes(provider)) {
      return res.status(400).json({ error: 'Invalid calendar provider' });
    }

    await calendarManager.disconnectCalendar(userId, provider as CalendarProvider);

    res.json({ success: true, message: `${provider} calendar disconnected` });
  } catch (error) {
    console.error('Calendar disconnection error:', error);
    res.status(500).json({ 
      error: 'Failed to disconnect calendar',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get user's connected calendars
router.get('/integrations', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { provider } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const integrations = await prisma.calendarIntegration.findMany({
      where: {
        userId,
        provider: provider as string || undefined,
        isActive: true
      },
      select: {
        id: true,
        provider: true,
        calendarName: true,
        isActive: true,
        syncEnabled: true,
        lastSyncAt: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({ integrations });
  } catch (error) {
    console.error('Get integrations error:', error);
    res.status(500).json({ 
      error: 'Failed to get calendar integrations',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get user's calendars from all providers
router.get('/calendars', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { provider } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const calendars = await calendarManager.getUserCalendars(
      userId, 
      provider as CalendarProvider || undefined
    );

    res.json({ calendars });
  } catch (error) {
    console.error('Get calendars error:', error);
    res.status(500).json({ 
      error: 'Failed to get calendars',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Sync calendars
router.post('/sync', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { integrationId, provider, startDate, endDate, direction } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const syncOptions: CalendarSyncOptions = {
      userId,
      integrationId,
      provider,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      direction: direction || 'bidirectional'
    };

    const results = await calendarManager.syncCalendars(syncOptions);

    res.json({ 
      success: true, 
      results,
      summary: {
        totalIntegrations: results.length,
        successfulSyncs: results.filter(r => r.success).length,
        totalEventsProcessed: results.reduce((sum, r) => sum + r.eventsProcessed, 0),
        totalEventsCreated: results.reduce((sum, r) => sum + r.eventsCreated, 0),
        totalEventsUpdated: results.reduce((sum, r) => sum + r.eventsUpdated, 0),
        totalErrors: results.reduce((sum, r) => sum + r.errors.length, 0)
      }
    });
  } catch (error) {
    console.error('Calendar sync error:', error);
    res.status(500).json({ 
      error: 'Failed to sync calendars',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get calendar events
router.get('/events', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { startDate, endDate, integrationId, isCoachingSession } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const where: any = {
      calendarIntegration: {
        userId,
        isActive: true
      }
    };

    if (integrationId) {
      where.calendarIntegrationId = integrationId as string;
    }

    if (startDate || endDate) {
      where.AND = [];
      if (startDate) {
        where.AND.push({
          startTime: { gte: new Date(startDate as string) }
        });
      }
      if (endDate) {
        where.AND.push({
          endTime: { lte: new Date(endDate as string) }
        });
      }
    }

    if (isCoachingSession !== undefined) {
      where.isCoachingSession = isCoachingSession === 'true';
    }

    const events = await prisma.calendarEvent.findMany({
      where,
      include: {
        calendarIntegration: {
          select: {
            provider: true,
            calendarName: true
          }
        },
        session: {
          select: {
            id: true,
            status: true,
            client: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: {
        startTime: 'asc'
      }
    });

    res.json({ events });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ 
      error: 'Failed to get calendar events',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create coaching session event
router.post('/events/coaching-session', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { sessionId, integrationId, title, description, startTime, endTime, location } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!sessionId || !integrationId || !title || !startTime || !endTime) {
      return res.status(400).json({ 
        error: 'Missing required fields: sessionId, integrationId, title, startTime, endTime' 
      });
    }

    // Verify the session belongs to the user (as coach)
    const session = await prisma.session.findFirst({
      where: {
        id: sessionId,
        coachId: userId
      }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found or access denied' });
    }

    const eventData = {
      title,
      description,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      location,
      timezone: 'UTC' // TODO: Use user's timezone
    };

    const calendarEvent = await calendarManager.createCoachingSessionEvent(
      sessionId,
      integrationId,
      eventData
    );

    res.json({ 
      success: true, 
      event: calendarEvent 
    });
  } catch (error) {
    console.error('Create coaching session event error:', error);
    res.status(500).json({ 
      error: 'Failed to create coaching session event',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update integration settings
router.patch('/integrations/:integrationId', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { integrationId } = req.params;
    const { syncEnabled, settings } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Verify the integration belongs to the user
    const integration = await prisma.calendarIntegration.findFirst({
      where: {
        id: integrationId,
        userId
      }
    });

    if (!integration) {
      return res.status(404).json({ error: 'Calendar integration not found' });
    }

    const updatedIntegration = await prisma.calendarIntegration.update({
      where: { id: integrationId },
      data: {
        syncEnabled: syncEnabled !== undefined ? syncEnabled : integration.syncEnabled,
        settings: settings || integration.settings,
        updatedAt: new Date()
      },
      select: {
        id: true,
        provider: true,
        calendarName: true,
        isActive: true,
        syncEnabled: true,
        lastSyncAt: true,
        settings: true,
        updatedAt: true
      }
    });

    res.json({ 
      success: true, 
      integration: updatedIntegration 
    });
  } catch (error) {
    console.error('Update integration error:', error);
    res.status(500).json({ 
      error: 'Failed to update calendar integration',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get sync logs
router.get('/sync-logs', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { integrationId, limit = '10' } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const where: any = {
      calendarIntegration: {
        userId
      }
    };

    if (integrationId) {
      where.calendarIntegrationId = integrationId as string;
    }

    const syncLogs = await prisma.calendarSyncLog.findMany({
      where,
      include: {
        calendarIntegration: {
          select: {
            provider: true,
            calendarName: true
          }
        }
      },
      orderBy: {
        startedAt: 'desc'
      },
      take: parseInt(limit as string)
    });

    res.json({ syncLogs });
  } catch (error) {
    console.error('Get sync logs error:', error);
    res.status(500).json({ 
      error: 'Failed to get sync logs',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 