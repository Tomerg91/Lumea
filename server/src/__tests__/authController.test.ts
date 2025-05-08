import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Request, Response } from 'express';
import { authController } from '../controllers/authController';
import { validateInviteToken, invalidateInviteToken } from '../utils/tokenHelpers';
import { User } from '../models/User';
import { Role } from '../models/Role';
import bcrypt from 'bcryptjs';

// Mock dependencies
vi.mock('../utils/tokenHelpers', () => ({
  validateInviteToken: vi.fn(),
  invalidateInviteToken: vi.fn(),
}));

vi.mock('bcryptjs', () => ({
  genSalt: vi.fn(),
  hash: vi.fn(),
}));

// Mock models
vi.mock('../models/User', () => ({
  User: {
    findOne: vi.fn(),
    create: vi.fn(),
  },
}));

// Mock Role model
vi.mock('../models/Role', () => ({
  Role: {
    findOne: vi.fn(),
  },
}));

describe('AuthController - registerWithInvite', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let mockUser: any;
  let mockClientRole: any;

  beforeEach(() => {
    // Reset all mocks
    vi.resetAllMocks();

    // Setup mock request and response
    req = {
      params: { token: 'valid-token-123' },
      body: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'johndoe@example.com',
        password: 'password123',
      },
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    // Setup mock user
    mockUser = {
      _id: 'user-id-123',
      firstName: 'John',
      lastName: 'Doe',
      email: 'johndoe@example.com',
      role: 'client-role-id',
    };

    mockClientRole = {
      _id: 'client-role-id',
      name: 'client',
    };

    // Setup default mock implementations
    (validateInviteToken as any).mockResolvedValue({
      token: 'valid-token-123',
      coachId: 'coach-id-123',
      email: 'johndoe@example.com',
      expires: new Date(Date.now() + 30 * 60 * 1000),
    });

    (Role.findOne as any).mockResolvedValue(mockClientRole);

    (bcrypt.genSalt as any).mockResolvedValue('salt');
    (bcrypt.hash as any).mockResolvedValue('hashed-password');

    (User.findOne as any).mockResolvedValue(null);
    (User.create as any).mockResolvedValue(mockUser);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully register a client with a valid invitation token', async () => {
    await authController.registerWithInvite(req as Request, res as Response);

    expect(validateInviteToken).toHaveBeenCalledWith('valid-token-123');
    expect(User.findOne).toHaveBeenCalledWith({ email: 'johndoe@example.com' });
    expect(bcrypt.genSalt).toHaveBeenCalled();
    expect(bcrypt.hash).toHaveBeenCalledWith('password123', 'salt');
    expect(Role.findOne).toHaveBeenCalledWith({ name: 'client' });
    expect(User.create).toHaveBeenCalledWith({
      firstName: 'John',
      lastName: 'Doe',
      email: 'johndoe@example.com',
      password: 'hashed-password',
      role: 'client-role-id',
      coachId: 'coach-id-123',
      isActive: true,
      isApproved: true,
    });
    expect(invalidateInviteToken).toHaveBeenCalledWith('valid-token-123');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Registration successful',
      user: {
        id: 'user-id-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'johndoe@example.com',
        role: 'client',
      },
    });
  });

  it('should return 400 if token is invalid or expired', async () => {
    (validateInviteToken as any).mockResolvedValue(null);

    await authController.registerWithInvite(req as Request, res as Response);

    expect(validateInviteToken).toHaveBeenCalledWith('valid-token-123');
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid or expired invitation token' });
  });

  it('should return 400 if email does not match the invitation', async () => {
    (validateInviteToken as any).mockResolvedValue({
      token: 'valid-token-123',
      coachId: 'coach-id-123',
      email: 'different@example.com',
      expires: new Date(Date.now() + 30 * 60 * 1000),
    });

    await authController.registerWithInvite(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Email does not match the invitation' });
  });

  it('should return 400 if user already exists', async () => {
    (User.findOne as any).mockResolvedValue({ email: 'johndoe@example.com' });

    await authController.registerWithInvite(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'A user with this email already exists' });
  });

  it('should return 500 if client role is not found', async () => {
    (Role.findOne as any).mockResolvedValue(null);

    await authController.registerWithInvite(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Client role not found' });
  });
});
