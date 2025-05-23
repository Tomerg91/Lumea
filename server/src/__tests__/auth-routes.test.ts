import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { Session } from '../models/Session';
import { jwtConfig } from '../auth/config';
import { generateTokens } from '../auth/tokenUtils';

// Mock the models
vi.mock('../models/User');
vi.mock('../models/Role');
vi.mock('../models/Session');
vi.mock('../auth/tokenUtils');

// Mock the Express app
let app: any;

// Mock data
const mockUser = {
  _id: new mongoose.Types.ObjectId(),
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: {
    _id: new mongoose.Types.ObjectId(),
    name: 'client',
  },
  isActive: true,
  comparePassword: vi.fn(),
  toJSON: vi.fn(() => ({
    _id: mockUser._id,
    email: mockUser.email,
    firstName: mockUser.firstName,
    lastName: mockUser.lastName,
    role: mockUser.role,
  })),
};

// Mock tokens
const mockTokens = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
};

describe('Authentication Routes', () => {
  beforeAll(async () => {
    // Import app dynamically to ensure mocks are set up first
    const { default: expressApp } = await import('../server');
    app = expressApp;
  });

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
  });

  describe('POST /api/auth/login', () => {
    it('should return tokens when login is successful', async () => {
      // Setup mocks
      (User.findOne as any).mockResolvedValue(mockUser);
      mockUser.comparePassword.mockResolvedValue(true);
      (generateTokens as any).mockResolvedValue(mockTokens);

      // Perform request
      const response = await request(app).post('/api/auth/login').send({
        email: 'test@example.com',
        password: 'password123',
      });

      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken', mockTokens.accessToken);
      expect(response.body).toHaveProperty('refreshToken', mockTokens.refreshToken);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', mockUser.email);

      // Verify that proper methods were called
      expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(mockUser.comparePassword).toHaveBeenCalledWith('password123');
      expect(generateTokens).toHaveBeenCalledWith(
        mockUser._id,
        mockUser.role.name,
        expect.any(String), // IP address
        expect.any(String) // User agent
      );
    });

    it('should return 401 when email is not found', async () => {
      // Setup mocks
      (User.findOne as any).mockResolvedValue(null);

      // Perform request
      const response = await request(app).post('/api/auth/login').send({
        email: 'nonexistent@example.com',
        password: 'password123',
      });

      // Assertions
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(User.findOne).toHaveBeenCalledWith({ email: 'nonexistent@example.com' });
      expect(generateTokens).not.toHaveBeenCalled();
    });

    it('should return 401 when password is incorrect', async () => {
      // Setup mocks
      (User.findOne as any).mockResolvedValue(mockUser);
      mockUser.comparePassword.mockResolvedValue(false);

      // Perform request
      const response = await request(app).post('/api/auth/login').send({
        email: 'test@example.com',
        password: 'wrongpassword',
      });

      // Assertions
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(mockUser.comparePassword).toHaveBeenCalledWith('wrongpassword');
      expect(generateTokens).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should issue new tokens with a valid refresh token', async () => {
      // Setup JWT verification mock
      const jwtVerifySpy = vi.spyOn(jwt, 'verify');
      jwtVerifySpy.mockImplementation(() => ({
        sub: mockUser._id.toString(),
        type: 'refresh',
        jti: 'test-token-id',
      }));

      // Setup session find mock
      (Session.findOne as any).mockResolvedValue({
        user: mockUser._id,
        refreshToken: 'test-token-id',
        expiresAt: new Date(Date.now() + 1000 * 60 * 60), // 1 hour in the future
      });

      // Setup user find mock
      (User.findById as any).mockResolvedValue(mockUser);

      // Setup token generation mock
      (generateTokens as any).mockResolvedValue(mockTokens);

      // Perform request
      const response = await request(app).post('/api/auth/refresh').send({
        refreshToken: 'valid-refresh-token',
      });

      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken', mockTokens.accessToken);
      expect(response.body).toHaveProperty('refreshToken', mockTokens.refreshToken);
      expect(jwt.verify).toHaveBeenCalledWith('valid-refresh-token', jwtConfig.refreshSecret);
      expect(Session.findOne).toHaveBeenCalled();
      expect(User.findById).toHaveBeenCalledWith(mockUser._id.toString());
      expect(generateTokens).toHaveBeenCalled();
    });

    it('should return 401 with an invalid refresh token', async () => {
      // Setup JWT verification to throw an error
      const jwtVerifySpy = vi.spyOn(jwt, 'verify');
      jwtVerifySpy.mockImplementation(() => {
        throw new jwt.JsonWebTokenError('invalid token');
      });

      // Perform request
      const response = await request(app).post('/api/auth/refresh').send({
        refreshToken: 'invalid-refresh-token',
      });

      // Assertions
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(jwt.verify).toHaveBeenCalledWith('invalid-refresh-token', jwtConfig.refreshSecret);
      expect(Session.findOne).not.toHaveBeenCalled();
      expect(User.findById).not.toHaveBeenCalled();
      expect(generateTokens).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should invalidate the refresh token and return success', async () => {
      // Setup JWT verification mock
      const jwtVerifySpy = vi.spyOn(jwt, 'verify');
      jwtVerifySpy.mockImplementation(() => ({
        sub: mockUser._id.toString(),
        type: 'refresh',
        jti: 'test-token-id',
      }));

      // Setup session update mock
      (Session.updateOne as any).mockResolvedValue({ modifiedCount: 1 });

      // Perform request
      const response = await request(app).post('/api/auth/logout').send({
        refreshToken: 'valid-refresh-token',
      });

      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Logged out successfully');
      expect(jwt.verify).toHaveBeenCalledWith('valid-refresh-token', jwtConfig.refreshSecret);
      expect(Session.updateOne).toHaveBeenCalled();
    });

    it('should return 400 when refresh token is missing', async () => {
      // Perform request without refresh token
      const response = await request(app).post('/api/auth/logout').send({});

      // Assertions
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(jwt.verify).not.toHaveBeenCalled();
      expect(Session.updateOne).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return the authenticated user profile', async () => {
      // Setup Passport mock for authentication
      // This requires mocking req.user which is normally set by passport middleware
      // For testing, we'll directly mock the route handler by applying the mock before app import

      // Perform request with Authentication header
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer valid-access-token');
      // Mocked passport will set req.user to mockUser

      // Assertions based on how your route should respond
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('_id', mockUser._id.toString());
      expect(response.body).toHaveProperty('email', mockUser.email);
    });

    it('should return 401 when not authenticated', async () => {
      // Perform request without Authentication header
      const response = await request(app).get('/api/auth/me');

      // Assertions
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });
});
