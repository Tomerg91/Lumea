import { Request, Response } from 'express';
import { analyticsService, AnalyticsDateRange } from '../services/analyticsService';

export const analyticsController = {
  /**
   * Get comprehensive analytics dashboard
   */
  async getDashboard(req: Request, res: Response) {
    try {
      const dateRange: AnalyticsDateRange = {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      };

      const dashboard = await analyticsService.generateDashboard(dateRange);
      res.json(dashboard);
    } catch (error) {
      console.error('Error generating analytics dashboard:', error);
      res.status(500).json({ 
        message: 'Error generating analytics dashboard',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  },

  /**
   * Get session metrics only
   */
  async getSessionMetrics(req: Request, res: Response) {
    try {
      const dateRange: AnalyticsDateRange = {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      };

      const sessionMetrics = await analyticsService.getSessionMetrics(dateRange);
      res.json(sessionMetrics);
    } catch (error) {
      console.error('Error fetching session metrics:', error);
      res.status(500).json({ 
        message: 'Error fetching session metrics',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  },

  /**
   * Get client engagement metrics
   */
  async getClientEngagement(req: Request, res: Response) {
    try {
      const dateRange: AnalyticsDateRange = {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      };

      const clientEngagement = await analyticsService.getClientEngagementMetrics(dateRange);
      res.json(clientEngagement);
    } catch (error) {
      console.error('Error fetching client engagement metrics:', error);
      res.status(500).json({ 
        message: 'Error fetching client engagement metrics',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  },

  /**
   * Get coach performance metrics
   */
  async getCoachPerformance(req: Request, res: Response) {
    try {
      const dateRange: AnalyticsDateRange = {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      };

      const coachPerformance = await analyticsService.getCoachPerformanceMetrics(dateRange);
      res.json(coachPerformance);
    } catch (error) {
      console.error('Error fetching coach performance metrics:', error);
      res.status(500).json({ 
        message: 'Error fetching coach performance metrics',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  },

  /**
   * Get reflection analytics
   */
  async getReflectionAnalytics(req: Request, res: Response) {
    try {
      const dateRange: AnalyticsDateRange = {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      };

      const reflectionAnalytics = await analyticsService.getReflectionAnalytics(dateRange);
      res.json(reflectionAnalytics);
    } catch (error) {
      console.error('Error fetching reflection analytics:', error);
      res.status(500).json({ 
        message: 'Error fetching reflection analytics',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  },

  /**
   * Get coach notes analytics
   */
  async getCoachNotesAnalytics(req: Request, res: Response) {
    try {
      const dateRange: AnalyticsDateRange = {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      };

      const userId = req.user?.role === 'coach' ? req.user.id : undefined;
      const coachNotesAnalytics = await analyticsService.getCoachNotesAnalytics(dateRange, userId);
      res.json(coachNotesAnalytics);
    } catch (error) {
      console.error('Error fetching coach notes analytics:', error);
      res.status(500).json({ 
        message: 'Error fetching coach notes analytics',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  },

  /**
   * Export analytics data in various formats
   */
  async exportData(req: Request, res: Response) {
    try {
      const format = req.body.format || req.query.format || 'json';
      
      if (!['json', 'csv', 'pdf', 'excel'].includes(format)) {
        return res.status(400).json({ 
          message: 'Unsupported export format. Use "json", "csv", "pdf", or "excel".' 
        });
      }

      const dateRange: AnalyticsDateRange = {
        startDate: req.body.startDate || req.query.startDate ? 
          new Date((req.body.startDate || req.query.startDate) as string) : undefined,
        endDate: req.body.endDate || req.query.endDate ? 
          new Date((req.body.endDate || req.query.endDate) as string) : undefined,
      };

      const exportData = await analyticsService.exportAnalyticsData(format as 'json' | 'csv' | 'pdf' | 'excel', dateRange);

      // Set appropriate headers based on format
      res.setHeader('Content-Type', exportData.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${exportData.filename}"`);

      if (format === 'json') {
        res.json(exportData.data);
      } else if (format === 'csv') {
        res.send(exportData.data);
      } else if (format === 'pdf' || format === 'excel') {
        // For binary data (PDF/Excel), send as buffer
        res.send(exportData.data);
      }
    } catch (error) {
      console.error('Error exporting analytics data:', error);
      res.status(500).json({ 
        message: 'Error exporting analytics data',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  },

  // Legacy compatibility methods (keeping for backward compatibility if needed)
  async getRevenue(req: Request, res: Response) {
    res.status(501).json({ 
      message: 'Revenue analytics not implemented. This platform focuses on session and coaching analytics.' 
    });
  },

  async getUserGrowth(req: Request, res: Response) {
    // Redirect to client engagement which includes user growth data
    return this.getClientEngagement(req, res);
  },

  async getPeakUsage(req: Request, res: Response) {
    try {
      const dateRange: AnalyticsDateRange = {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      };

      const sessionMetrics = await analyticsService.getSessionMetrics(dateRange);
      
      // Extract peak usage patterns from session trends
      const peakUsage = sessionMetrics.sessionTrends.reduce((peak, current) => {
        return current.sessions > peak.sessions ? current : peak;
      }, { date: '', sessions: 0, completed: 0 });

      res.json({
        peakDate: peakUsage.date,
        peakSessions: peakUsage.sessions,
        sessionTrends: sessionMetrics.sessionTrends,
        weeklyAverage: sessionMetrics.averageSessionsPerWeek
      });
    } catch (error) {
      console.error('Error fetching peak usage data:', error);
      res.status(500).json({ 
        message: 'Error fetching peak usage data',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
};
