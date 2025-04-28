import express from 'express';
import { isAdmin } from '../middleware/auth';
import { analyticsController } from '../src/controllers/analyticsController';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Apply admin middleware to all admin routes
router.use(isAdmin);

// Get system overview statistics
router.get('/stats', async (req, res) => {
  try {
    const [
      totalUsers,
      totalSessions,
      totalPayments,
      activeUsers,
      recentSessions
    ] = await Promise.all([
      // Get total users
      prisma.user.count(),
      
      // Get total sessions
      prisma.session.count(),
      
      // Get total payments
      prisma.payment.aggregate({
        where: { status: 'paid' },
        _sum: { amount: true }
      }),
      
      // Get active users in last 30 days
      prisma.session.groupBy({
        by: ['clientId'],
        where: {
          date: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        },
        _count: true
      }),
      
      // Get recent sessions
      prisma.session.findMany({
        take: 5,
        orderBy: { date: 'desc' },
        include: {
          client: true,
          coach: true
        }
      })
    ]);

    res.json({
      totalUsers,
      totalSessions,
      totalPayments: totalPayments._sum.amount || 0,
      activeUsers: activeUsers.length,
      recentSessions
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ message: 'Failed to fetch admin statistics' });
  }
});

// Get user management data
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 10, role, search } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const where = {
      ...(role && role !== 'all' ? { role: role as string } : {}),
      ...(search ? {
        OR: [
          { name: { contains: search as string } },
          { email: { contains: search as string } }
        ]
      } : {})
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: offset,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      users,
      total,
      page: Number(page),
      limit: Number(limit)
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Analytics routes
router.get('/analytics/revenue', analyticsController.getRevenue);
router.get('/analytics/user-growth', analyticsController.getUserGrowth);
router.get('/analytics/session-metrics', analyticsController.getSessionMetrics);
router.get('/analytics/coach-performance', analyticsController.getCoachPerformance);
router.get('/analytics/peak-usage', analyticsController.getPeakUsage);
router.post('/analytics/export', analyticsController.exportData);

export default router; 