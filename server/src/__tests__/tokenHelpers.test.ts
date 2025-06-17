import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Types } from 'mongoose';
import {
  generateSecureToken,
  createInviteToken,
  validateInviteToken,
  createPasswordResetToken,
  validatePasswordResetToken,
  invalidatePasswordResetToken,
  invalidateInviteToken,
} from '../utils/tokenHelpers.js';
import crypto from 'crypto';
import { InviteToken } from '../models/InviteToken.js';
import { PasswordResetToken } from '../models/PasswordResetToken.js';

// Mock the models and crypto
jest.mock('../models/InviteToken', () => ({
  InviteToken: {
    create: jest.fn(),
    findOne: jest.fn(),
    deleteMany: jest.fn(),
    deleteOne: jest.fn(),
    countDocuments: jest.fn(),
  },
}));

jest.mock('../models/PasswordResetToken', () => ({
  PasswordResetToken: {
    create: jest.fn(),
    findOne: jest.fn(),
    deleteMany: jest.fn(),
    deleteOne: jest.fn(),
  },
}));

jest.mock('crypto', () => ({
  randomBytes: jest.fn(),
}));

describe('Token Helpers', () => {
  const mockToken = 'mockedtoken123456789abcdef';
  const mockObjectId = new Types.ObjectId('507f1f77bcf86cd799439011'); // Fixed ObjectId

  // Reset all mocks before each test
  beforeEach(() => {
    jest.resetAllMocks();

    // Setup default mock implementations
    (crypto.randomBytes as any).mockReturnValue({
      toString: () => mockToken,
    });

    (InviteToken.create as any).mockResolvedValue({
      token: mockToken,
      coachId: mockObjectId,
      email: 'test@example.com',
      expires: new Date(Date.now() + 30 * 60 * 1000),
    });

    (InviteToken.findOne as any).mockResolvedValue({
      token: mockToken,
      coachId: mockObjectId,
      email: 'test@example.com',
      expires: new Date(Date.now() + 30 * 60 * 1000),
    });

    (PasswordResetToken.create as any).mockResolvedValue({
      token: mockToken,
      userId: mockObjectId,
      expires: new Date(Date.now() + 30 * 60 * 1000),
    });

    (PasswordResetToken.findOne as any).mockResolvedValue({
      token: mockToken,
      userId: mockObjectId,
      expires: new Date(Date.now() + 30 * 60 * 1000),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateSecureToken', () => {
    it('should generate a secure random token', () => {
      const token = generateSecureToken();
      expect(crypto.randomBytes).toHaveBeenCalledWith(48);
      expect(token).toBe(mockToken);
    });
  });

  describe('createInviteToken', () => {
    it('should delete existing invites and create a new invite token', async () => {
      const email = 'test@example.com';
      const coachId = mockObjectId;

      const token = await createInviteToken(coachId, email);

      expect(InviteToken.deleteMany).toHaveBeenCalledWith({ email });
      expect(InviteToken.create).toHaveBeenCalledWith({
        token: mockToken,
        coachId,
        email,
        expires: expect.any(Date),
      });
      expect(token).toBe(mockToken);
    });

    it('should convert string IDs to ObjectId', async () => {
      const email = 'test@example.com';
      const stringId = mockObjectId.toString();

      await createInviteToken(stringId, email);

      expect(InviteToken.create).toHaveBeenCalledWith({
        token: mockToken,
        coachId: expect.any(Types.ObjectId),
        email,
        expires: expect.any(Date),
      });
    });
  });

  describe('validateInviteToken', () => {
    it('should return the token document if valid', async () => {
      const result = await validateInviteToken(mockToken);

      expect(InviteToken.findOne).toHaveBeenCalledWith({
        token: mockToken,
        expires: { $gt: expect.any(Date) },
      });
      expect(result).toEqual({
        token: mockToken,
        coachId: mockObjectId,
        email: 'test@example.com',
        expires: expect.any(Date),
      });
    });

    it('should return null if token not found or expired', async () => {
      (InviteToken.findOne as any).mockResolvedValue(null);

      const result = await validateInviteToken(mockToken);

      expect(result).toBeNull();
    });
  });

  describe('createPasswordResetToken', () => {
    it('should delete existing reset tokens and create a new one', async () => {
      const userId = mockObjectId;

      const token = await createPasswordResetToken(userId);

      expect(PasswordResetToken.deleteMany).toHaveBeenCalledWith({ userId });
      expect(PasswordResetToken.create).toHaveBeenCalledWith({
        token: mockToken,
        userId,
        expires: expect.any(Date),
      });
      expect(token).toBe(mockToken);
    });

    it('should convert string IDs to ObjectId', async () => {
      const stringId = mockObjectId.toString();

      await createPasswordResetToken(stringId);

      expect(PasswordResetToken.create).toHaveBeenCalledWith({
        token: mockToken,
        userId: expect.any(Types.ObjectId),
        expires: expect.any(Date),
      });
    });
  });

  describe('validatePasswordResetToken', () => {
    it('should return the token document if valid', async () => {
      const result = await validatePasswordResetToken(mockToken);

      expect(PasswordResetToken.findOne).toHaveBeenCalledWith({
        token: mockToken,
        expires: { $gt: expect.any(Date) },
      });
      expect(result).toEqual({
        token: mockToken,
        userId: mockObjectId,
        expires: expect.any(Date),
      });
    });

    it('should return null if token not found or expired', async () => {
      (PasswordResetToken.findOne as any).mockResolvedValue(null);

      const result = await validatePasswordResetToken(mockToken);

      expect(result).toBeNull();
    });
  });

  describe('invalidatePasswordResetToken', () => {
    it('should delete the token', async () => {
      await invalidatePasswordResetToken(mockToken);

      expect(PasswordResetToken.deleteOne).toHaveBeenCalledWith({ token: mockToken });
    });
  });

  describe('invalidateInviteToken', () => {
    it('should delete the token', async () => {
      await invalidateInviteToken(mockToken);

      expect(InviteToken.deleteOne).toHaveBeenCalledWith({ token: mockToken });
    });
  });

  describe('Token validation edge cases', () => {
    it('should handle expired tokens correctly', async () => {
      // Mock expired token
      (InviteToken.findOne as any).mockResolvedValue(null);
      
      const result = await validateInviteToken('expired-token');
      
      expect(result).toBeNull();
      expect(InviteToken.findOne).toHaveBeenCalledWith({
        token: 'expired-token',
        expires: { $gt: expect.any(Date) },
      });
    });
  });
});
