import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
// import scrypt from 'scrypt-js'; // scrypt logic is now handled in storage.ts if needed for password verification, or by bcrypt in User model
import { db } from '../../db'; // Import Drizzle db instance
import { users, User as DrizzleUser } from '../../../shared/schema'; // Import Drizzle schema and type
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
// import { User } from '../models/User.js'; // No longer directly using User model here
// import { HydratedDocument } from 'mongoose'; // Not needed
import { AuthenticatedUserPayload } from '../types/user.js'; // Import the correct payload type
import { IUser } from '../models/User.js'; // Needed for fullUser type

// Remove local AuthenticatedUser interface, use AuthenticatedUserPayload from types
/*
interface AuthenticatedUser {
  _id: string;
  email: string;
  name: string;
  role: string;
  [key: string]: unknown;
}
*/

// scrypt constants are not used here anymore if password check is in storage or User model
/*
const SCRYPT_N = 16384;
const SCRYPT_r = 8;
const SCRYPT_p = 1;
const SCRYPT_dkLen = 64;
*/

export function configurePassport() {
  // Configure Local Strategy to use Drizzle
  passport.use(
    new LocalStrategy(
      {
        usernameField: 'email',
        passwordField: 'password',
      },
      async (email, password, done) => {
        try {
          console.log('[LocalStrategy] Attempting to authenticate user with Drizzle:', email);
          
          const user = await db.query.users.findFirst({
            where: eq(users.email, email),
          });

          if (!user) {
            console.log('[LocalStrategy] User not found:', email);
            return done(null, false, { message: 'Incorrect email or password.' });
          }

          const isValid = await bcrypt.compare(password, user.password);

          if (!isValid) {
            console.log('[LocalStrategy] Invalid password for user:', email);
            return done(null, false, { message: 'Incorrect email or password.' });
          }
          
          console.log('[LocalStrategy] Authentication successful for user:', email);
          return done(null, user); // Pass the full Drizzle user object
        } catch (error) {
          console.error('[LocalStrategy] Error during authentication:', error);
          return done(error);
        }
      }
    )
  );

  // Configure serialization for Drizzle
  passport.serializeUser((user: DrizzleUser, done) => {
    console.log('[serializeUser] Serializing user:', user.id);
    done(null, user.id);
  });

  // Configure deserialization for Drizzle
  passport.deserializeUser(async (id: number, done) => {
    console.log('[deserializeUser] Attempting to deserialize user with ID:', id);
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, id),
      });

      if (!user) {
        console.error('[deserializeUser] User not found for ID:', id);
        return done(new Error('User not found.'));
      }
      
      console.log('[deserializeUser] Successfully deserialized user:', id);
      done(null, user);
    } catch (error) {
      console.error('[deserializeUser] Error deserializing user:', error);
      done(error);
    }
  });
}
