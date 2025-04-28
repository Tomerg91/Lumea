import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';
import { PrismaClient, User as PrismaUser } from '@prisma/client';

const prisma = new PrismaClient();

// Define the shape of the user object attached to req.user
// This should include only non-sensitive, necessary information
export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

declare global {
  namespace Express {
    interface User extends AuthenticatedUser {}
  }
}

passport.use(
  new LocalStrategy(
    { usernameField: 'email' },
    async (email, password, done) => {
      try {
        console.log(`Attempting login for email: ${email}`);
        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          console.log(`Login failed: No user found for email ${email}`);
          return done(null, false, { message: 'Incorrect email.' });
        }

        if (!user.password) {
            console.log(`Login failed: User ${email} has no password set.`);
            return done(null, false, { message: 'Password not set for user.' });
        }

        console.log(`User found: ${user.id}. Comparing password.`);
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
          console.log(`Login failed: Incorrect password for email ${email}`);
          return done(null, false, { message: 'Incorrect password.' });
        }

        const authenticatedUser: AuthenticatedUser = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role || 'DEFAULT_ROLE',
        };
        console.log(`Login successful for user: ${authenticatedUser.id}`);
        return done(null, authenticatedUser);
      } catch (err) {
         console.error('Error during authentication strategy:', err);
        return done(err);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  console.log(`Serializing user: ${(<AuthenticatedUser>user).id}`);
  done(null, (<AuthenticatedUser>user).id);
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
      return done(null, false, { message: 'User not found.' });
    }

    const authenticatedUser: AuthenticatedUser = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role || 'DEFAULT_ROLE',
    };
    console.log(`User deserialized successfully: ${authenticatedUser.id}`);
    done(null, authenticatedUser);
  } catch (err) {
    console.error('Error during user deserialization:', err);
    done(err);
  }
});

export default passport;