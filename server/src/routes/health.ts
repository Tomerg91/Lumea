import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Basic health check
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Readiness check (includes database connectivity)
router.get('/ready', async (req: Request, res: Response) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    
    // Check critical environment variables
    const requiredEnvVars = [
      'DATABASE_URL',
      'JWT_SECRET',
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY'
    ];
    
    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    
    if (missingEnvVars.length > 0) {
      return res.status(503).json({
        status: 'not ready',
        message: 'Missing required environment variables',
        missing: missingEnvVars
      });
    }
    
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      database: 'connected',
      environment: 'configured'
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 