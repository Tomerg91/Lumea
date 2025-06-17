import { describe, it, expect, beforeAll, jest } from '@jest/globals';
import { Types } from 'mongoose';
import { User } from '../models/User';
import { Role } from '../models/Role';
import { Session } from '../models/Session';
import { Reflection } from '../models/Reflection';
import { CoachNote } from '../models/CoachNote';
import { Resource } from '../models/Resource';

// Mocks for Mongoose to avoid actual DB calls
jest.mock('mongoose', async () => {
  const actual = await import('mongoose');
  return {
    __esModule: true,
    default: {
      ...actual.default,
      model: jest.fn().mockImplementation((name, schema) => {
        // Create a mock model function that mimics the behavior of a Mongoose model
        function MockModel(data: any) {
          return {
            ...data,
            save: jest.fn().mockResolvedValue(data),
            validate: jest.fn().mockImplementation(function () {
              return schema.methods.validate
                ? schema.methods.validate.call(this)
                : Promise.resolve();
            }),
          };
        }

        // Add static methods from the schema
        Object.assign(MockModel, schema.statics);

        // Mock additional commonly used Mongoose model methods
        MockModel.create = jest.fn().mockImplementation(async (data) => {
          // Run validation before creating
          const doc = MockModel(data);
          await doc.validate();
          return doc;
        });

        return MockModel;
      }),
    },
    Types: actual.Types,
  };
});

describe('Mongoose Models', () => {
  // Create common test resources
  let roleId: Types.ObjectId;
  let userId: Types.ObjectId;

  beforeAll(() => {
    roleId = new Types.ObjectId();
    userId = new Types.ObjectId();
  });

  describe('Role Model', () => {
    it('should create a valid role', async () => {
      const roleData = {
        name: 'admin' as const,
        description: 'Administrator role',
      };

      const role = new Role(roleData);
      expect(role).toBeDefined();
      expect(role.name).toBe('admin');
      expect(role.description).toBe('Administrator role');
    });

    it('should reject invalid role name', async () => {
      const roleData = {
        name: 'invalid-role' as any,
        description: 'Invalid role type',
      };

      // This should fail validation
      expect(() => new Role(roleData)).toThrow();
    });
  });

  describe('User Model', () => {
    it('should create a valid user', async () => {
      const userData = {
        email: 'test@example.com',
        passwordHash: 'hashed_password_here',
        firstName: 'Test',
        lastName: 'User',
        role: roleId,
        isActive: true,
      };

      const user = new User(userData);
      expect(user).toBeDefined();
      expect(user.email).toBe('test@example.com');
      expect(user.firstName).toBe('Test');
      expect(user.lastName).toBe('User');
      expect(user.isActive).toBe(true);
    });

    it('should reject invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        passwordHash: 'hashed_password_here',
        role: roleId,
        isActive: true,
      };

      const user = new User(userData);

      // Create a spy for the validate method
      const validateSpy = jest.spyOn(user, 'validate');

      // Validation should fail
      await expect(user.validate()).rejects.toThrow();
      expect(validateSpy).toHaveBeenCalled();
    });

    it('should require passwordHash', async () => {
      const userData = {
        email: 'test@example.com',
        role: roleId,
        isActive: true,
      };

      const user = new User(userData);

      // Validation should fail due to missing required field
      await expect(user.validate()).rejects.toThrow();
    });
  });

  describe('Session Model', () => {
    it('should create a valid session', async () => {
      const now = new Date();
      const future = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

      const sessionData = {
        user: userId,
        refreshToken: 'valid-refresh-token',
        expiresAt: future,
        issuedAt: now,
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 (Vitest)',
      };

      const session = new Session(sessionData);
      expect(session).toBeDefined();
      expect(session.user).toEqual(userId);
      expect(session.refreshToken).toBe('valid-refresh-token');
      expect(session.expiresAt).toEqual(future);
      expect(session.ipAddress).toBe('127.0.0.1');
    });

    it('should require user, refreshToken and expiresAt', async () => {
      const sessionData = {
        // Missing required fields
        ipAddress: '127.0.0.1',
      };

      const session = new Session(sessionData);

      // Validation should fail due to missing required fields
      await expect(session.validate()).rejects.toThrow();
    });
  });

  describe('Reflection Model', () => {
    it('should create a valid reflection', async () => {
      const sessionId = new Types.ObjectId();
      const clientId = new Types.ObjectId();
      const coachId = new Types.ObjectId();

      const reflectionData = {
        sessionId,
        clientId,
        coachId,
        answers: [
          {
            questionId: 'self_awareness_1',
            value: 'I discovered that I have a pattern of avoiding difficult conversations.',
          },
          {
            questionId: 'self_awareness_2',
            value: 7,
          }
        ],
        status: 'submitted' as const,
        submittedAt: new Date(),
      };

      const reflection = new Reflection(reflectionData);
      expect(reflection).toBeDefined();
      expect(reflection.sessionId).toEqual(sessionId);
      expect(reflection.clientId).toEqual(clientId);
      expect(reflection.coachId).toEqual(coachId);
      expect(reflection.status).toBe('submitted');
      expect(reflection.answers).toHaveLength(2);
      expect(reflection.answers[0].questionId).toBe('self_awareness_1');
    });

    it('should require sessionId, clientId, and coachId', async () => {
      const reflectionData = {
        answers: [
          {
            questionId: 'test_question',
            value: 'Test answer',
          }
        ],
        status: 'draft' as const,
      };

      const reflection = new Reflection(reflectionData);

      // Validation should fail due to missing required fields
      await expect(reflection.validate()).rejects.toThrow();
    });

    it('should validate status enum values', async () => {
      const sessionId = new Types.ObjectId();
      const clientId = new Types.ObjectId();
      const coachId = new Types.ObjectId();

      const reflectionData = {
        sessionId,
        clientId,
        coachId,
        answers: [],
        status: 'invalid-status' as any,
      };

      const reflection = new Reflection(reflectionData);

      // Validation should fail due to invalid enum value
      await expect(reflection.validate()).rejects.toThrow();
    });

    it('should default status to draft and set lastSavedAt', async () => {
      const sessionId = new Types.ObjectId();
      const clientId = new Types.ObjectId();
      const coachId = new Types.ObjectId();

      const reflectionData = {
        sessionId,
        clientId,
        coachId,
        answers: [],
      };

      const reflection = new Reflection(reflectionData);
      expect(reflection.status).toBe('draft');
      expect(reflection.version).toBe(1);
      expect(reflection.lastSavedAt).toBeDefined();
    });
  });

  describe('CoachNote Model', () => {
    it('should create a valid coach note', async () => {
      const clientId = new Types.ObjectId();

      const noteData = {
        coach: userId,
        client: clientId,
        title: 'Session Notes',
        content: 'Client showed progress in these areas...',
        visibility: 'private_to_coach' as const,
      };

      const note = new CoachNote(noteData);
      expect(note).toBeDefined();
      expect(note.coach).toEqual(userId);
      expect(note.client).toEqual(clientId);
      expect(note.title).toBe('Session Notes');
      expect(note.content).toBe('Client showed progress in these areas...');
      expect(note.visibility).toBe('private_to_coach');
    });

    it('should require coach, client, and content', async () => {
      const noteData = {
        title: 'Incomplete Note',
        visibility: 'private_to_coach' as const,
      };

      const note = new CoachNote(noteData);

      // Validation should fail due to missing required fields
      await expect(note.validate()).rejects.toThrow();
    });

    it('should validate visibility enum values', async () => {
      const clientId = new Types.ObjectId();

      const noteData = {
        coach: userId,
        client: clientId,
        content: 'Test content',
        visibility: 'invalid-visibility' as any,
      };

      const note = new CoachNote(noteData);

      // Validation should fail due to invalid enum value
      await expect(note.validate()).rejects.toThrow();
    });
  });

  describe('Resource Model', () => {
    it('should create a valid resource with URL', async () => {
      const resourceData = {
        title: 'Helpful Article',
        description: 'An article about coaching techniques',
        url: 'https://example.com/article',
        resourceType: 'article' as const,
        tags: ['coaching', 'techniques'],
        addedBy: userId,
        sharedWithRoles: ['coach', 'client'] as const,
      };

      const resource = new Resource(resourceData);
      expect(resource).toBeDefined();
      expect(resource.title).toBe('Helpful Article');
      expect(resource.url).toBe('https://example.com/article');
      expect(resource.resourceType).toBe('article');
      expect(resource.addedBy).toEqual(userId);
      expect(resource.tags).toHaveLength(2);
      expect(resource.sharedWithRoles).toContain('coach');
    });

    it('should validate that either URL or filePath is provided', async () => {
      const resourceData = {
        title: 'Missing Resource Path',
        resourceType: 'document' as const,
        addedBy: userId,
        // Missing both url and filePath
      };

      const resource = new Resource(resourceData);

      // Create a spy for the validate method
      const validateSpy = jest.spyOn(resource, 'validate');

      // Validation should fail due to missing both url and filePath
      await expect(resource.validate()).rejects.toThrow();
      expect(validateSpy).toHaveBeenCalled();
    });

    it('should validate resource type enum values', async () => {
      const resourceData = {
        title: 'Invalid Resource Type',
        url: 'https://example.com/article',
        resourceType: 'invalid-type' as any,
        addedBy: userId,
      };

      const resource = new Resource(resourceData);

      // Validation should fail due to invalid resourceType enum value
      await expect(resource.validate()).rejects.toThrow();
    });

    it('should validate URL format', async () => {
      const resourceData = {
        title: 'Invalid URL',
        url: 'not-a-valid-url',
        resourceType: 'link' as const,
        addedBy: userId,
      };

      const resource = new Resource(resourceData);

      // Validation should fail due to invalid URL format
      await expect(resource.validate()).rejects.toThrow();
    });
  });
});
