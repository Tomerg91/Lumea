import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';

const prisma = new PrismaClient();

// Define the shape of the user object attached to req.user
// This should include only non-sensitive, necessary information
// Make sure it matches Express.User interface in src/types/express.d.ts
export interface AuthenticatedUser {
  _id: string;
  id: string;
  email: string;
  name: string | null;
  role: 'coach' | 'client' | 'admin';
  [key: string]: unknown;
}

declare global {
  namespace Express {
    interface User extends AuthenticatedUser {}
  }
}

passport.use(
  new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
    try {
      console.log(`Attempting login for email: ${email}`);
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        console.log(`Login failed: No user found for email ${email}`);
        return done(null, false);
      }

      if (!user.password) {
        console.log(`Login failed: User ${email} has no password set.`);
        return done(null, false);
      }

      console.log(`User found: ${user.id}. Comparing password.`);
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        console.log(`Login failed: Incorrect password for email ${email}`);
        return done(null, false);
      }

      const authenticatedUser: Express.User = {
        _id: user.id,
        id: user.id,
        email: user.email,
        name: user.name || '',
        role: (user.role as 'coach' | 'client' | 'admin') || 'client',
      };
      console.log(`Login successful for user: ${authenticatedUser.id}`);
      return done(null, authenticatedUser);
    } catch (err) {
      console.error('Error during authentication strategy:', err);
      return done(err);
    }
  })
);

passport.serializeUser((user: Express.User, done) => {
  console.log(`Serializing user ID: ${user.id}`);
  // user.id is already a string as per Prisma schema and AuthenticatedUser interface
  done(null, user.id); 
});

passport.deserializeUser(async (id: string, done) => {
  try {
    console.log(`Deserializing user ID: ${id}`);
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    if (!user) {
      console.log(`Deserialization failed: User not found for ID ${id}`);
      return done(null, false);
    }

    // Note: user from select won't have status, so no need to map it.
    const authenticatedUser: Express.User = {
      _id: user.id,
      id: user.id,
      email: user.email,
      name: user.name || '',
      role: (user.role as 'coach' | 'client' | 'admin') || 'client',
    };
    console.log(`User deserialized successfully: ${authenticatedUser.id}`);
    done(null, authenticatedUser);
  } catch (err) {
    console.error('Error during user deserialization:', err);
    done(err);
  }
});

export default passport;
