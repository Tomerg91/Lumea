import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose, { Types } from 'mongoose';
import { User, IUser } from '../models/User';
import { Role, IRole } from '../models/Role';
import { Session, ISession } from '../models/Session';
import { Reflection, IReflection } from '../models/Reflection';
import { CoachNote, ICoachNote } from '../models/CoachNote';
import { Resource, IResource } from '../models/Resource';

// Mocks for Mongoose to avoid actual DB calls
vi.mock('mongoose', async () => {
  const actual = await import('mongoose');
  return {
    __esModule: true,
    default: {
      ...actual.default,
      model: vi.fn().mockImplementation((name, schema) => {
        // Create a mock model function that mimics the behavior of a Mongoose model
        function MockModel(data: any) {
          return {
            ...data,
            save: vi.fn().mockResolvedValue(data),
            validate: vi.fn().mockImplementation(function() {
              return schema.methods.validate ? schema.methods.validate.call(this) : Promise.resolve();
            }),
          };
        }
        
        // Add static methods from the schema
        Object.assign(MockModel, schema.statics);
        
        // Mock additional commonly used Mongoose model methods
        MockModel.create = vi.fn().mockImplementation(async (data) => {
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
        description: 'Administrator role'
      };

      const role = new Role(roleData);
      expect(role).toBeDefined();
      expect(role.name).toBe('admin');
      expect(role.description).toBe('Administrator role');
    });

    it('should reject invalid role name', async () => {
      const roleData = {
        name: 'invalid-role' as any,
        description: 'Invalid role type'
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
        isActive: true
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
        isActive: true
      };

      const user = new User(userData);
      
      // Create a spy for the validate method
      const validateSpy = vi.spyOn(user, 'validate');
      
      // Validation should fail
      await expect(user.validate()).rejects.toThrow();
      expect(validateSpy).toHaveBeenCalled();
    });

    it('should require passwordHash', async () => {
      const userData = {
        email: 'test@example.com',
        role: roleId,
        isActive: true
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
        userAgent: 'Mozilla/5.0 (Vitest)'
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
        ipAddress: '127.0.0.1'
      };

      const session = new Session(sessionData);
      
      // Validation should fail due to missing required fields
      await expect(session.validate()).rejects.toThrow();
    });
  });

  describe('Reflection Model', () => {
    it('should create a valid reflection', async () => {
      const reflectionData = {
        user: userId,
        title: 'My Reflection',
        content: 'This is a reflection on my progress.',
        visibility: 'private' as const
      };

      const reflection = new Reflection(reflectionData);
      expect(reflection).toBeDefined();
      expect(reflection.user).toEqual(userId);
      expect(reflection.title).toBe('My Reflection');
      expect(reflection.content).toBe('This is a reflection on my progress.');
      expect(reflection.visibility).toBe('private');
    });

    it('should require user and content', async () => {
      const reflectionData = {
        title: 'Incomplete Reflection',
        visibility: 'private' as const
      };

      const reflection = new Reflection(reflectionData);
      
      // Validation should fail due to missing required fields
      await expect(reflection.validate()).rejects.toThrow();
    });

    it('should validate visibility enum values', async () => {
      const reflectionData = {
        user: userId,
        content: 'Test content',
        visibility: 'invalid-visibility' as any
      };

      const reflection = new Reflection(reflectionData);
      
      // Validation should fail due to invalid enum value
      await expect(reflection.validate()).rejects.toThrow();
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
        visibility: 'private_to_coach' as const
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
        visibility: 'private_to_coach' as const
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
        visibility: 'invalid-visibility' as any
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
        sharedWithRoles: ['coach', 'client'] as const
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
        addedBy: userId
        // Missing both url and filePath
      };

      const resource = new Resource(resourceData);
      
      // Create a spy for the validate method
      const validateSpy = vi.spyOn(resource, 'validate');
      
      // Validation should fail due to missing both url and filePath
      await expect(resource.validate()).rejects.toThrow();
      expect(validateSpy).toHaveBeenCalled();
    });

    it('should validate resource type enum values', async () => {
      const resourceData = {
        title: 'Invalid Resource Type',
        url: 'https://example.com/article',
        resourceType: 'invalid-type' as any,
        addedBy: userId
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
        addedBy: userId
      };

      const resource = new Resource(resourceData);
      
      // Validation should fail due to invalid URL format
      await expect(resource.validate()).rejects.toThrow();
    });
  });
}); 