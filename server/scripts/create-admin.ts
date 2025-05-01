import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    // Get command line arguments
    const email = process.argv[2];
    const password = process.argv[3];
    const name = process.argv[4];

    if (!email || !password || !name) {
      console.log('Usage: npm run create-admin -- <email> <password> "<name>"');
      console.log('Example: npm run create-admin -- admin@example.com mypassword "Admin User"');
      process.exit(1);
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.error('A user with this email already exists');
      process.exit(1);
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the admin user
    const adminUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'admin',
        status: 'active',
      },
    });

    console.log('Admin user created successfully:', {
      id: adminUser.id,
      email: adminUser.email,
      name: adminUser.name,
      role: adminUser.role,
    });
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();
