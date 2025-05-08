/**
 * Bootstrap script to initialize the database with roles and sample users
 *
 * Usage: npm run bootstrap
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { Role } from '../src/models/Role';
import { User } from '../src/models/User';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/satyacoaching';
const SALT_ROUNDS = 10;

/**
 * Seed roles
 */
async function seedRoles() {
  console.log('Seeding roles...');

  const roles = [
    { name: 'admin', description: 'Administrator with full access' },
    { name: 'coach', description: 'Coach with access to client data and coaching tools' },
    { name: 'client', description: 'Client with limited access to their own data' },
  ];

  // Create roles
  for (const role of roles) {
    try {
      const existingRole = await Role.findOne({ name: role.name });

      if (!existingRole) {
        await Role.create(role);
        console.log(`Created role: ${role.name}`);
      } else {
        console.log(`Role ${role.name} already exists`);
      }
    } catch (error) {
      console.error(`Error creating role ${role.name}:`, error);
    }
  }
}

/**
 * Seed users
 */
async function seedUsers() {
  console.log('Seeding users...');

  // First, get role IDs
  const adminRole = await Role.findOne({ name: 'admin' });
  const coachRole = await Role.findOne({ name: 'coach' });
  const clientRole = await Role.findOne({ name: 'client' });

  if (!adminRole || !coachRole || !clientRole) {
    console.error('Required roles not found. Make sure to run seedRoles() first.');
    return;
  }

  const users = [
    {
      email: 'admin@example.com',
      password: 'adminpassword',
      firstName: 'Admin',
      lastName: 'User',
      role: adminRole._id,
    },
    {
      email: 'coach@example.com',
      password: 'coachpassword',
      firstName: 'Coach',
      lastName: 'User',
      role: coachRole._id,
    },
    {
      email: 'client@example.com',
      password: 'clientpassword',
      firstName: 'Client',
      lastName: 'User',
      role: clientRole._id,
    },
  ];

  // Create users
  for (const userData of users) {
    try {
      const existingUser = await User.findOne({ email: userData.email });

      if (!existingUser) {
        // Hash password - normally this would be handled by the User model pre-save hook,
        // but we're setting it explicitly for clarity
        const passwordHash = await bcrypt.hash(userData.password, SALT_ROUNDS);

        // Create user with hashed password
        const user = await User.create({
          ...userData,
          passwordHash,
        });

        console.log(
          `Created user: ${user.email} (${userData.firstName} ${userData.lastName}) with role: ${userData.role}`
        );
      } else {
        console.log(`User ${userData.email} already exists`);
      }
    } catch (error) {
      console.error(`Error creating user ${userData.email}:`, error);
    }
  }
}

/**
 * Main bootstrap function
 */
async function bootstrap() {
  try {
    // Connect to MongoDB
    console.log(`Connecting to MongoDB at ${MONGODB_URI}...`);
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Seed roles and users
    await seedRoles();
    await seedUsers();

    console.log('Bootstrap completed successfully');
  } catch (error) {
    console.error('Bootstrap failed:', error);
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Run the bootstrap function
bootstrap();
