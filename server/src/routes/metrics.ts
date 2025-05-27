import express from 'express';

const router = express.Router();

/**
 * POST /api/metrics/performance
 * Endpoint to receive client-side performance metrics
 */
router.post('/performance', async (req, res) => {
  try {
    const metrics = req.body;

    // Only log in development mode to reduce performance overhead
    if (process.env.NODE_ENV === 'development') {
      console.debug('Performance metrics received:', {
        url: metrics.url,
        loadTime: metrics.loadTime,
        timestamp: new Date().toISOString(),
      });

      // If metrics indicate a performance issue, log it
      if (metrics.loadTime && metrics.loadTime > 3000) {
        console.warn('Performance issue detected:', {
          url: metrics.url,
          loadTime: metrics.loadTime,
          timestamp: new Date().toISOString(),
        });
      }
    }

    res.status(201).json({ status: 'success', message: 'Metrics received' });
  } catch (error) {
    console.error('Error processing performance metrics:', error);
    res.status(500).json({ status: 'error', message: 'Failed to process metrics' });
  }
});

/**
 * GET /api/metrics/summary
 * Endpoint to get aggregated performance metrics (admin only)
 */
router.get('/summary', async (req, res) => {
  try {
    // For now, return a simple response
    // In production, you would query your database for actual metrics
    res.status(200).json({
      status: 'success',
      data: {
        message: 'Metrics summary endpoint is available',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error getting performance metrics summary:', error);
    res.status(500).json({ status: 'error', message: 'Failed to get metrics summary' });
  }
});

export default router; 