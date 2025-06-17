import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { User } from '../models/User.js';
import { CoachingSession } from '../models/CoachingSession.js';
import { Reflection } from '../models/Reflection.js';
import { CoachNote } from '../models/CoachNote.js';
import { SessionFeedback } from '../models/SessionFeedback.js';

describe('Analytics System Tests', () => {
  let authToken: string;
  let coachId: string;
  let clientId: string;
  let sessionId: string;

  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/lumea-test');
    }

    // Clean up existing test data
    await User.deleteMany({ email: { $regex: /test.*@analytics\.test/ } });
    await CoachingSession.deleteMany({});
    await Reflection.deleteMany({});
    await CoachNote.deleteMany({});
    await SessionFeedback.deleteMany({});

    // Create test users
    const coach = await User.create({
      email: 'test.coach@analytics.test',
      password: 'testpassword123',
      firstName: 'Test',
      lastName: 'Coach',
      role: 'coach',
      isEmailVerified: true
    });
    coachId = coach._id.toString();

    const client = await User.create({
      email: 'test.client@analytics.test',
      password: 'testpassword123',
      firstName: 'Test',
      lastName: 'Client',
      role: 'client',
      isEmailVerified: true
    });
    clientId = client._id.toString();

    // Login as coach to get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test.coach@analytics.test',
        password: 'testpassword123'
      });

    authToken = loginResponse.body.token;

    // Create test data
    await createTestData();
  });

  afterAll(async () => {
    // Clean up test data
    await User.deleteMany({ email: { $regex: /test.*@analytics\.test/ } });
    await CoachingSession.deleteMany({});
    await Reflection.deleteMany({});
    await CoachNote.deleteMany({});
    await SessionFeedback.deleteMany({});
    
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  async function createTestData() {
    // Create test sessions
    const session1 = await CoachingSession.create({
      coach: coachId,
      client: clientId,
      scheduledDate: new Date('2024-01-15T10:00:00Z'),
      duration: 60,
      status: 'completed',
      sessionType: 'individual',
      notes: 'Test session 1'
    });
    sessionId = session1._id.toString();

    await CoachingSession.create({
      coach: coachId,
      client: clientId,
      scheduledDate: new Date('2024-01-22T10:00:00Z'),
      duration: 60,
      status: 'completed',
      sessionType: 'individual',
      notes: 'Test session 2'
    });

    await CoachingSession.create({
      coach: coachId,
      client: clientId,
      scheduledDate: new Date('2024-01-29T10:00:00Z'),
      duration: 60,
      status: 'cancelled',
      sessionType: 'individual',
      notes: 'Test session 3 - cancelled'
    });

    // Create test reflections
    await Reflection.create({
      user: clientId,
      session: sessionId,
      content: 'Test reflection 1',
      category: 'personal-growth',
      mood: 4,
      insights: ['Test insight 1'],
      completionTime: 15
    });

    await Reflection.create({
      user: clientId,
      session: sessionId,
      content: 'Test reflection 2',
      category: 'goal-setting',
      mood: 5,
      insights: ['Test insight 2'],
      completionTime: 20
    });

    // Create test coach notes
    await CoachNote.create({
      coach: coachId,
      client: clientId,
      session: sessionId,
      content: 'Test coach note',
      tags: ['progress', 'goals']
    });

    // Create test session feedback
    await SessionFeedback.create({
      session: sessionId,
      client: clientId,
      coach: coachId,
      rating: 5,
      feedback: 'Excellent session',
      helpfulnessRating: 5
    });
  }

  describe('Analytics API Endpoints', () => {
    it('should get analytics dashboard data', async () => {
      const response = await request(app)
        .get('/api/analytics/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('overview');
      expect(response.body).toHaveProperty('sessionMetrics');
      expect(response.body).toHaveProperty('clientEngagement');
      expect(response.body).toHaveProperty('coachPerformance');
      expect(response.body).toHaveProperty('reflectionAnalytics');
      expect(response.body).toHaveProperty('dateRange');

      // Validate overview data
      expect(response.body.overview.totalSessions).toBeGreaterThanOrEqual(3);
      expect(response.body.overview.totalClients).toBeGreaterThanOrEqual(1);
      expect(response.body.overview.totalCoaches).toBeGreaterThanOrEqual(1);
      expect(response.body.overview.totalReflections).toBeGreaterThanOrEqual(2);
    });

    it('should get session metrics', async () => {
      const response = await request(app)
        .get('/api/analytics/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalSessions');
      expect(response.body).toHaveProperty('completedSessions');
      expect(response.body).toHaveProperty('cancelledSessions');
      expect(response.body).toHaveProperty('completionRate');
      expect(response.body).toHaveProperty('sessionTrends');

      expect(response.body.totalSessions).toBeGreaterThanOrEqual(3);
      expect(response.body.completedSessions).toBeGreaterThanOrEqual(2);
      expect(response.body.cancelledSessions).toBeGreaterThanOrEqual(1);
    });

    it('should get client engagement metrics', async () => {
      const response = await request(app)
        .get('/api/analytics/clients')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalClients');
      expect(response.body).toHaveProperty('activeClients');
      expect(response.body).toHaveProperty('clientRetentionRate');
      expect(response.body).toHaveProperty('averageSessionsPerClient');
      expect(response.body).toHaveProperty('reflectionSubmissionRate');
    });

    it('should get coach performance metrics', async () => {
      const response = await request(app)
        .get('/api/analytics/coaches')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalCoaches');
      expect(response.body).toHaveProperty('activeCoaches');
      expect(response.body).toHaveProperty('coaches');
      expect(Array.isArray(response.body.coaches)).toBe(true);
    });

    it('should get reflection analytics', async () => {
      const response = await request(app)
        .get('/api/analytics/reflections')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalReflections');
      expect(response.body).toHaveProperty('submissionRate');
      expect(response.body).toHaveProperty('averageCompletionTime');
      expect(response.body).toHaveProperty('reflectionsByCategory');
      expect(response.body).toHaveProperty('categoryEngagement');
    });

    it('should handle date range filtering', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';

      const response = await request(app)
        .get(`/api/analytics/dashboard?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.dateRange.startDate).toBe(startDate + 'T00:00:00.000Z');
      expect(response.body.dateRange.endDate).toBe(endDate + 'T23:59:59.999Z');
    });
  });

  describe('Export Functionality', () => {
    it('should export data as JSON', async () => {
      const response = await request(app)
        .get('/api/analytics/export?format=json')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['content-type']).toContain('application/json');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('.json');
    });

    it('should export data as CSV', async () => {
      const response = await request(app)
        .get('/api/analytics/export?format=csv')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('.csv');
    });

    it('should export data as Excel', async () => {
      const response = await request(app)
        .get('/api/analytics/export?format=excel')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('.xlsx');
    });

    it('should export data as PDF', async () => {
      const response = await request(app)
        .get('/api/analytics/export?format=pdf')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['content-type']).toContain('application/pdf');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('.pdf');
    });

    it('should reject unsupported export formats', async () => {
      await request(app)
        .get('/api/analytics/export?format=xml')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });

  describe('Performance Tests', () => {
    it('should respond to dashboard request within acceptable time', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/analytics/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds
    });

    it('should handle concurrent requests efficiently', async () => {
      const requests = Array(5).fill(null).map(() =>
        request(app)
          .get('/api/analytics/dashboard')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      expect(totalTime).toBeLessThan(10000); // All 5 requests should complete within 10 seconds
    });
  });

  describe('Data Accuracy Tests', () => {
    it('should calculate completion rate correctly', async () => {
      const response = await request(app)
        .get('/api/analytics/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const { totalSessions, completedSessions, completionRate } = response.body;
      const expectedCompletionRate = (completedSessions / totalSessions) * 100;
      
      expect(Math.abs(completionRate - expectedCompletionRate)).toBeLessThan(0.1);
    });

    it('should aggregate reflection data correctly', async () => {
      const response = await request(app)
        .get('/api/analytics/reflections')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.totalReflections).toBeGreaterThanOrEqual(2);
      expect(response.body.reflectionsByCategory).toHaveProperty('personal-growth');
      expect(response.body.reflectionsByCategory).toHaveProperty('goal-setting');
    });
  });

  describe('Authorization Tests', () => {
    it('should require authentication for analytics endpoints', async () => {
      await request(app)
        .get('/api/analytics/dashboard')
        .expect(401);
    });

    it('should require coach or admin role for analytics access', async () => {
      // Login as client
      const clientLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test.client@analytics.test',
          password: 'testpassword123'
        });

      const clientToken = clientLoginResponse.body.token;

      await request(app)
        .get('/api/analytics/dashboard')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(403);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid date ranges gracefully', async () => {
      const response = await request(app)
        .get('/api/analytics/dashboard?startDate=invalid-date&endDate=2024-01-31')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200); // Should still work with default dates

      expect(response.body).toHaveProperty('overview');
    });

    it('should handle database connection issues gracefully', async () => {
      // This test would require mocking database failures
      // For now, we'll just ensure the endpoint structure is correct
      const response = await request(app)
        .get('/api/analytics/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('overview');
    });
  });
}); 