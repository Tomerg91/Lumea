import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * POST /api/metrics/performance
 * Endpoint to receive client-side performance metrics
 */
router.post('/performance', async (req, res) => {
  try {
    const metrics = req.body;

    // Add additional context
    metrics.userId = req.user?.id || null;
    metrics.userAgent = req.headers['user-agent'];
    metrics.ipAddress = req.ip;
    metrics.timestamp = metrics.timestamp || Date.now();

    // Store metrics in database
    await prisma.performanceMetric.create({
      data: {
        userId: metrics.userId,
        url: metrics.url,
        userAgent: metrics.userAgent,
        ipAddress: metrics.ipAddress,
        timestamp: new Date(metrics.timestamp),
        metrics: metrics as any, // Store the full metrics object
      },
    });

    // If metrics indicate a performance issue, log it
    if (metrics.loadTime && metrics.loadTime > 3000) {
      console.warn('Performance issue detected:', {
        url: metrics.url,
        loadTime: metrics.loadTime,
        userId: metrics.userId,
      });
    }

    res.status(201).send({ status: 'success', message: 'Metrics received' });
  } catch (error) {
    console.error('Error saving performance metrics:', error);
    res.status(500).send({ status: 'error', message: 'Failed to save metrics' });
  }
});

/**
 * GET /api/metrics/summary
 * Endpoint to get aggregated performance metrics (admin only)
 */
router.get('/summary', async (req, res) => {
  try {
    // Check admin permission
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).send({ status: 'error', message: 'Unauthorized' });
    }

    // Get date range from query params
    const startDate = req.query.start
      ? new Date(req.query.start as string)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Default to last 7 days

    const endDate = req.query.end ? new Date(req.query.end as string) : new Date();

    // Get metrics within date range
    const metrics = await prisma.performanceMetric.findMany({
      where: {
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    // Calculate aggregates
    const totalMetrics = metrics.length;

    // Page load times
    const loadTimes = metrics.map((m) => (m.metrics as any).loadTime).filter(Boolean);

    const avgLoadTime = loadTimes.length
      ? loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length
      : null;

    const maxLoadTime = loadTimes.length ? Math.max(...loadTimes) : null;

    // Response to client
    res.status(200).send({
      status: 'success',
      data: {
        timeRange: {
          start: startDate,
          end: endDate,
        },
        metrics: {
          total: totalMetrics,
          loadTime: {
            average: avgLoadTime,
            max: maxLoadTime,
          },
        },
        recentEntries: metrics.slice(0, 10).map((m) => ({
          id: m.id,
          url: m.url,
          timestamp: m.timestamp,
          loadTime: (m.metrics as any).loadTime,
        })),
      },
    });
  } catch (error) {
    console.error('Error getting performance metrics summary:', error);
    res.status(500).send({ status: 'error', message: 'Failed to get metrics summary' });
  }
});

export default router;
