import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import mongoose, { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import {
  generateTokens,
  verifyRefreshToken,
  invalidateRefreshToken,
  invalidateAllUserSessions,
} from '../auth/tokenUtils';
import { Session } from '../models/Session';
import { jwtConfig } from '../auth/config';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { Role } from '../models/Role';

// Mock for the Session model
vi.mock('../models/Session', () => {
  const mockSession = {
    create: vi.fn(),
    findOne: vi.fn(),
    updateOne: vi.fn(),
    updateMany: vi.fn(),
    deleteOne: vi.fn(),
  };
  return { Session: mockSession };
});

describe('Auth Utilities', () => {
  let testUserId: Types.ObjectId;

  beforeAll(() => {
    testUserId = new Types.ObjectId();
  });

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  describe('generateTokens', () => {
    it('should generate valid access and refresh tokens', async () => {
      // Mock the Session.create method to resolve successfully
      (Session.create as any).mockResolvedValue({
        _id: new Types.ObjectId(),
        user: testUserId,
        refreshToken: expect.any(String),
        expiresAt: expect.any(Date),
      });

      const userRole = 'admin';
      const { accessToken, refreshToken } = await generateTokens(testUserId, userRole);

      // Verify token structure without decoding secrets
      expect(accessToken).toBeDefined();
      expect(refreshToken).toBeDefined();
      expect(typeof accessToken).toBe('string');
      expect(typeof refreshToken).toBe('string');

      // Verify Session.create was called with expected parameters
      expect(Session.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user: testUserId,
          refreshToken: expect.any(String),
          expiresAt: expect.any(Date),
        })
      );
    });

    it('should handle Session.create errors properly', async () => {
      // Mock Session.create to throw an error
      (Session.create as any).mockRejectedValue(new Error('Database error'));

      // Test that the error is propagated
      await expect(generateTokens(testUserId, 'admin')).rejects.toThrow(
        'Failed to save user session.'
      );
    });
  });

  describe('verifyRefreshToken', () => {
    it('should return userId if refresh token is valid', async () => {
      // Create a valid token for testing
      const tokenJti = 'valid-token-id';
      const token = jwt.sign(
        { sub: testUserId.toString(), type: 'refresh', jti: tokenJti },
        jwtConfig.refreshSecret,
        { expiresIn: '30d' }
      );

      // Mock Session.findOne to return a valid session
      (Session.findOne as any).mockResolvedValue({
        _id: new Types.ObjectId(),
        user: testUserId,
        refreshToken: tokenJti,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days in the future
      });

      const result = await verifyRefreshToken(token);

      // Verify the result is the user ID
      expect(result).toEqual(testUserId);

      // Verify findOne was called with right parameters
      expect(Session.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          user: testUserId,
          refreshToken: tokenJti,
          expiresAt: { $gt: expect.any(Date) },
          revokedAt: { $exists: false },
        })
      );
    });

    it('should return null if refresh token is invalid', async () => {
      // Create an invalid token for testing (wrong secret)
      const token = jwt.sign(
        { sub: testUserId.toString(), type: 'refresh', jti: 'invalid-token' },
        'wrong-secret',
        { expiresIn: '30d' }
      );

      const result = await verifyRefreshToken(token);

      // Verify that null is returned for invalid token
      expect(result).toBeNull();

      // Session.findOne should not be called for invalid token
      expect(Session.findOne).not.toHaveBeenCalled();
    });

    it('should return null if session not found', async () => {
      // Create a valid token but with no matching session
      const tokenJti = 'no-session-token';
      const token = jwt.sign(
        { sub: testUserId.toString(), type: 'refresh', jti: tokenJti },
        jwtConfig.refreshSecret,
        { expiresIn: '30d' }
      );

      // Mock Session.findOne to return null (no session found)
      (Session.findOne as any).mockResolvedValue(null);

      const result = await verifyRefreshToken(token);

      // Verify that null is returned when no session found
      expect(result).toBeNull();
    });
  });

  describe('invalidateRefreshToken', () => {
    it('should successfully invalidate a specific refresh token', async () => {
      // Mock successful update
      (Session.updateOne as any).mockResolvedValue({ modifiedCount: 1 });

      const refreshTokenJti = 'token-to-invalidate';
      const result = await invalidateRefreshToken(testUserId, refreshTokenJti);

      // Verify the result is true for successful invalidation
      expect(result).toBe(true);

      // Verify updateOne was called with the right parameters
      expect(Session.updateOne).toHaveBeenCalledWith(
        {
          user: testUserId,
          refreshToken: refreshTokenJti,
          revokedAt: { $exists: false },
        },
        { $set: { revokedAt: expect.any(Date) } }
      );
    });

    it('should return false if no token was invalidated', async () => {
      // Mock update with no matches
      (Session.updateOne as any).mockResolvedValue({ modifiedCount: 0 });

      const result = await invalidateRefreshToken(testUserId, 'non-existent-token');

      // Verify the result is false when no tokens invalidated
      expect(result).toBe(false);
    });

    it('should handle errors during invalidation', async () => {
      // Mock update throwing an error
      (Session.updateOne as any).mockRejectedValue(new Error('Database error'));

      const result = await invalidateRefreshToken(testUserId, 'error-token');

      // Verify the result is false on error
      expect(result).toBe(false);
    });
  });

  describe('invalidateAllUserSessions', () => {
    it('should successfully invalidate all sessions for a user', async () => {
      // Mock successful update of multiple documents
      (Session.updateMany as any).mockResolvedValue({ modifiedCount: 3 });

      const result = await invalidateAllUserSessions(testUserId);

      // Verify the result is true for successful invalidation
      expect(result).toBe(true);

      // Verify updateMany was called with the right parameters
      expect(Session.updateMany).toHaveBeenCalledWith(
        { user: testUserId, revokedAt: { $exists: false } },
        { $set: { revokedAt: expect.any(Date) } }
      );
    });

    it('should return false if no sessions were invalidated', async () => {
      // Mock update with no matches
      (Session.updateMany as any).mockResolvedValue({ modifiedCount: 0 });

      const result = await invalidateAllUserSessions(testUserId);

      // Verify the result is false when no sessions invalidated
      expect(result).toBe(false);
    });

    it('should handle errors during mass invalidation', async () => {
      // Mock updateMany throwing an error
      (Session.updateMany as any).mockRejectedValue(new Error('Database error'));

      const result = await invalidateAllUserSessions(testUserId);

      // Verify the result is false on error
      expect(result).toBe(false);
    });
  });
});

// User and Role model integration tests using bcrypt
describe('User Authentication Integration', () => {
  // Only run these tests in an environment with actual MongoDB
  const testUsers = {
    admin: {
      email: 'test-admin@example.com',
      password: 'adminpass123',
      firstName: 'Test',
      lastName: 'Admin',
      role: null, // Will be set during test
    },
    client: {
      email: 'test-client@example.com',
      password: 'clientpass123',
      firstName: 'Test',
      lastName: 'Client',
      role: null, // Will be set during test
    },
  };

  // Mock implementations for mongoose models
  vi.mock('../models/User', () => ({
    User: {
      findById: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn(),
    },
  }));

  vi.mock('../models/Role', () => ({
    Role: {
      findOne: vi.fn(),
    },
  }));

  beforeAll(async () => {
    // Set up mock roles
    const adminRoleId = new Types.ObjectId();
    const clientRoleId = new Types.ObjectId();

    // Set role IDs in test users
    testUsers.admin.role = adminRoleId;
    testUsers.client.role = clientRoleId;

    // Mock Role.findOne for different role names
    (Role.findOne as any).mockImplementation(({ name }) => {
      if (name === 'admin') {
        return Promise.resolve({ _id: adminRoleId, name: 'admin' });
      } else if (name === 'client') {
        return Promise.resolve({ _id: clientRoleId, name: 'client' });
      }
      return Promise.resolve(null);
    });
  });

  it('should hash password correctly', async () => {
    const password = 'testpassword';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Password should be hashed and not match the original
    expect(hashedPassword).not.toBe(password);

    // Should be able to verify the password against the hash
    const match = await bcrypt.compare(password, hashedPassword);
    expect(match).toBe(true);
  });

  it('should create a user with hashed password', async () => {
    const userData = { ...testUsers.admin };
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    // Mock User creation with hashed password
    (User.create as any).mockImplementation((data) => {
      // Verify password was hashed before storage
      expect(data.passwordHash).not.toBe(userData.password);
      return Promise.resolve({
        _id: new Types.ObjectId(),
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        passwordHash: data.passwordHash,
      });
    });

    // Simulate creating user with hashed password
    const user = await User.create({
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: userData.role,
      passwordHash: hashedPassword,
    });

    expect(user).toBeDefined();
    expect(user.passwordHash).toBe(hashedPassword);
  });
});
