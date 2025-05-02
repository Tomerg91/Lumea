import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import scrypt from 'scrypt-js';
import { getUserByEmail, getUserById } from '../storage.js';
import { User } from '../models/User.js';
import { HydratedDocument } from 'mongoose';

// Define an interface for an authenticated user
interface AuthenticatedUser {
  _id: string;
  email: string;
  name: string;
  role: string;
  [key: string]: unknown;
}

// Add these constants (should match the ones in storage.ts)
const SCRYPT_N = 16384;
const SCRYPT_r = 8;
const SCRYPT_p = 1;
const SCRYPT_dkLen = 64;

export function configurePassport() {
  // Configure Local Strategy
  passport.use(
    new LocalStrategy(
      {
        usernameField: 'email',
        passwordField: 'password',
      },
      async (email, password, done) => {
        try {
          console.log('[LocalStrategy] Attempting to authenticate user:', email);
          const user = await getUserByEmail(email);

          if (!user || !user.passwordSalt || !user.passwordHash) {
            console.log('[LocalStrategy] User not found or missing password data:', email);
            return done(null, false);
          }

          // Hash the provided password with the user's salt
          console.log('[LocalStrategy] Hashing provided password for comparison');
          const suppliedPasswordHashBuffer = await scrypt.scrypt(
            Buffer.from(password),
            Buffer.from(user.passwordSalt),
            SCRYPT_N,
            SCRYPT_r,
            SCRYPT_p,
            SCRYPT_dkLen
          );

          // Compare the hashes
          const storedPasswordHashBuffer = Buffer.from(user.passwordHash, 'hex');
          const isValid =
            Buffer.compare(suppliedPasswordHashBuffer, storedPasswordHashBuffer) === 0;

          if (!isValid) {
            console.log('[LocalStrategy] Invalid password for user:', email);
            return done(null, false);
          }

          console.log('[LocalStrategy] Authentication successful for user:', email);

          // Remove sensitive data before passing to session
          const userObject = user.toObject();
          delete userObject.passwordHash;
          delete userObject.passwordSalt;

          // Cast to Express.User since we've defined the interface in express.d.ts
          return done(null, userObject as Express.User);
        } catch (error) {
          console.error('[LocalStrategy] Error during authentication:', error);
          return done(error);
        }
      }
    )
  );

  // Configure serialization
  passport.serializeUser((user, done) => {
    console.log('[serializeUser] Serializing user:', user._id);
    done(null, user._id);
  });

  // Configure deserialization
  passport.deserializeUser(async (id: string, done) => {
    console.log('[deserializeUser] Attempting to deserialize user with ID:', id);
    try {
      const user = await getUserById(id);
      if (!user) {
        console.error('[deserializeUser] User not found for ID:', id);
        return done(null, false);
      }

      // Remove sensitive data before passing to session
      const userObject = user.toObject();
      delete userObject.passwordHash;
      delete userObject.passwordSalt;

      console.log('[deserializeUser] Successfully deserialized user:', id);
      // Cast to Express.User since we've defined the interface in express.d.ts
      done(null, userObject as Express.User);
    } catch (error) {
      console.error('[deserializeUser] Error deserializing user:', error);
      done(error);
    }
  });
}
