import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const analyticsController = {
  async getRevenue(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;
      const payments = await prisma.payment.findMany({
        where: {
          createdAt: {
            gte: startDate ? new Date(startDate as string) : undefined,
            lte: endDate ? new Date(endDate as string) : undefined
          },
          status: 'paid'
        },
        orderBy: {
          createdAt: 'asc'
        }
      });

      const revenueData = payments.reduce((acc: Record<string, number>, payment) => {
        const date = payment.createdAt.toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + payment.amount;
        return acc;
      }, {});

      res.json(revenueData);
    } catch (error) {
      console.error('Error fetching revenue data:', error);
      res.status(500).json({ message: 'Error fetching revenue data' });
    }
  },

  async getUserGrowth(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;
      const users = await prisma.user.findMany({
        where: {
          createdAt: {
            gte: startDate ? new Date(startDate as string) : undefined,
            lte: endDate ? new Date(endDate as string) : undefined
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      });

      const growthData = users.reduce((acc: Record<string, number>, user) => {
        const date = user.createdAt.toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});

      res.json(growthData);
    } catch (error) {
      console.error('Error fetching user growth data:', error);
      res.status(500).json({ message: 'Error fetching user growth data' });
    }
  },

  async getSessionMetrics(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;
      const sessions = await prisma.session.findMany({
        where: {
          date: {
            gte: startDate ? new Date(startDate as string) : undefined,
            lte: endDate ? new Date(endDate as string) : undefined
          }
        },
        include: {
          client: true,
          coach: true
        },
        orderBy: {
          date: 'asc'
        }
      });

      const metrics = {
        totalSessions: sessions.length,
        sessionsByStatus: sessions.reduce((acc: Record<string, number>, session) => {
          acc[session.status] = (acc[session.status] || 0) + 1;
          return acc;
        }, {}),
        sessionsByDate: sessions.reduce((acc: Record<string, number>, session) => {
          const date = session.date.toISOString().split('T')[0];
          acc[date] = (acc[date] || 0) + 1;
          return acc;
        }, {})
      };

      res.json(metrics);
    } catch (error) {
      console.error('Error fetching session metrics:', error);
      res.status(500).json({ message: 'Error fetching session metrics' });
    }
  },

  async getCoachPerformance(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;
      const coaches = await prisma.user.findMany({
        where: {
          role: 'coach',
        },
        include: {
          coachSessions: {
            where: {
              date: {
                gte: startDate ? new Date(startDate as string) : undefined,
                lte: endDate ? new Date(endDate as string) : undefined
              }
            },
            include: {
              client: true
            }
          }
        }
      });

      const performance = coaches.map(coach => {
        // Calculate unique clients
        const clientIds = new Set(coach.coachSessions.map(session => session.clientId));
        
        return {
          id: coach.id,
          name: coach.name,
          totalClients: clientIds.size, // Use size of Set for unique clients
          totalSessions: coach.coachSessions.length, // Correctly uses coachSessions
          sessionCompletionRate: coach.coachSessions.filter(session => session.status === 'completed').length / coach.coachSessions.length || 0 // Correctly uses coachSessions
        }
      });

      res.json(performance);
    } catch (error) {
      console.error('Error fetching coach performance data:', error);
      res.status(500).json({ message: 'Error fetching coach performance data' });
    }
  },

  /* // Commenting out function due to missing Session.title field
  async getPopularTopics(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;
      const sessions = await prisma.session.findMany({
        where: {
          date: {
            gte: startDate ? new Date(startDate as string) : undefined,
            lte: endDate ? new Date(endDate as string) : undefined
          }
        },
        select: {
          title: true // Error: title does not exist
        }
      });

      const topics = sessions.reduce((acc: Record<string, number>, session) => {
        const words = session.title.toLowerCase().split(' '); // Error: title does not exist
        words.forEach(word => {
          if (word.length > 3) { // Only count words longer than 3 characters
            acc[word] = (acc[word] || 0) + 1;
          }
        });
        return acc;
      }, {});

      const sortedTopics = Object.entries(topics)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .reduce((acc: Record<string, number>, [key, value]) => {
          acc[key] = value;
          return acc;
        }, {});

      res.json(sortedTopics);
    } catch (error) {
      console.error('Error fetching popular topics:', error);
      res.status(500).json({ message: 'Error fetching popular topics' });
    }
  },
  */

  async getPeakUsage(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;
      const sessions = await prisma.session.findMany({
        where: {
          date: {
            gte: startDate ? new Date(startDate as string) : undefined,
            lte: endDate ? new Date(endDate as string) : undefined
          }
        },
        select: {
          date: true
        }
      });

      const hourlyUsage = sessions.reduce((acc: Record<number, number>, session) => {
        const hour = session.date.getHours();
        acc[hour] = (acc[hour] || 0) + 1;
        return acc;
      }, {});

      const dailyUsage = sessions.reduce((acc: Record<string, number>, session) => {
        const day = session.date.getDay();
        acc[day] = (acc[day] || 0) + 1;
        return acc;
      }, {});

      res.json({
        hourlyUsage,
        dailyUsage
      });
    } catch (error) {
      console.error('Error fetching peak usage data:', error);
      res.status(500).json({ message: 'Error fetching peak usage data' });
    }
  },

  async exportData(req: Request, res: Response) {
    try {
      const { startDate, endDate, metrics } = req.body;
      const data: Record<string, any> = {};

      if (metrics.includes('revenue')) {
        data.revenue = await prisma.payment.findMany({
          where: {
            createdAt: {
              gte: startDate ? new Date(startDate) : undefined,
              lte: endDate ? new Date(endDate) : undefined
            },
            status: 'paid'
          },
          select: {
            amount: true,
            createdAt: true
          }
        });
      }

      if (metrics.includes('sessions')) {
        data.sessions = await prisma.session.findMany({
          where: {
            date: {
              gte: startDate ? new Date(startDate) : undefined,
              lte: endDate ? new Date(endDate) : undefined
            }
          },
          include: {
            client: true,
            coach: true
          }
        });
      }

      if (metrics.includes('users')) {
        data.users = await prisma.user.findMany({
          where: {
            createdAt: {
              gte: startDate ? new Date(startDate) : undefined,
              lte: endDate ? new Date(endDate) : undefined
            }
          },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true
          }
        });
      }

      const csv = this.convertToCSV(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=analytics.csv');
      res.send(csv);
    } catch (error) {
      console.error('Error exporting analytics data:', error);
      res.status(500).json({ message: 'Error exporting analytics data' });
    }
  },

  convertToCSV(data: Record<string, any>): string {
    const headers: string[] = [];
    const rows: string[][] = [];

    // Extract headers and data from each metric
    Object.entries(data).forEach(([metric, items]) => {
      if (Array.isArray(items) && items.length > 0) {
        const metricHeaders = Object.keys(items[0]).map(key => `${metric}_${key}`);
        headers.push(...metricHeaders);

        items.forEach((item, index) => {
          if (!rows[index]) rows[index] = [];
          const values = Object.values(item);
          rows[index].push(...values.map(value => 
            value instanceof Date ? value.toISOString() :
            typeof value === 'object' ? JSON.stringify(value) :
            String(value)
          ));
        });
      }
    });

    // Combine headers and rows into CSV format
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return csvContent;
  }
}; 