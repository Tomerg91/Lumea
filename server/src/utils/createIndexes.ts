import mongoose from 'mongoose';
import { CoachingSession } from '../models/CoachingSession';
import { User } from '../models/User';

/**
 * Create database indexes for optimized query performance
 * Run this during server initialization to ensure all indexes are properly set up
 */
export const createDatabaseIndexes = async (): Promise<void> => {
  try {
    console.log('Creating database indexes for improved performance...');

    // Get all models that need indexing
    const models = [
      { name: 'User', model: User },
      { name: 'CoachingSession', model: CoachingSession },
      // Add other models here as needed
    ];

    const indexPromises = [];

    // Create indexes for User model
    indexPromises.push(
      User.collection.createIndex({ email: 1 }, { unique: true, background: true }),
      User.collection.createIndex({ role: 1 }, { background: true }),
      User.collection.createIndex({ createdAt: -1 }, { background: true })
    );

    // Create indexes for CoachingSession model
    indexPromises.push(
      CoachingSession.collection.createIndex({ coachId: 1, date: -1 }, { background: true }),
      CoachingSession.collection.createIndex({ clientId: 1, date: -1 }, { background: true }),
      CoachingSession.collection.createIndex({ date: -1 }, { background: true })
    );

    // Execute all index creation operations
    await Promise.all(indexPromises);

    console.log('Database indexes created successfully');
  } catch (error) {
    console.error('Error creating database indexes:', error);
    // Don't throw error, as we don't want to crash the app if indexing fails
  }
};

export default createDatabaseIndexes;
