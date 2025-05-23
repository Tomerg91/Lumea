import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
// import scrypt from 'scrypt-js'; // scrypt logic is now handled in storage.ts if needed for password verification, or by bcrypt in User model
import { getFullUserByEmailForAuth, getUserByEmail, getUserById } from '../storage.js';
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
          const fullUser: IUser | null = await getFullUserByEmailForAuth(email);

          if (!fullUser || !fullUser.passwordHash) {
            // passwordHash implies passwordSalt also exists if schema is consistent
            console.log('[LocalStrategy] User not found or user data incomplete:', email);
            return done(null, false);
          }

          // Verify password using the method from User model
          const isValid = await fullUser.verifyPassword(password);

          if (!isValid) {
            console.log('[LocalStrategy] Invalid password for user:', email);
            return done(null, false);
          }

          // Password is valid, now get the payload for the session
          const authenticatedUserPayload = await getUserByEmail(email);

          if (!authenticatedUserPayload) {
            // This should ideally not happen if fullUser was found and password was valid,
            // but as a safeguard if getUserByEmail has further checks or fails.
            console.error(
              '[LocalStrategy] Could not retrieve AuthenticatedUserPayload for verified user:',
              email
            );
            return done(
              new Error('User authentication succeeded but failed to prepare session data.')
            );
          }

          console.log('[LocalStrategy] Authentication successful for user:', email);
          return done(null, authenticatedUserPayload);
        } catch (error) {
          console.error('[LocalStrategy] Error during authentication:', error);
          return done(error);
        }
      }
    )
  );

  // Configure serialization
  passport.serializeUser((user: AuthenticatedUserPayload, done) => {
    console.log('[serializeUser] Serializing user:', user.id);
    done(null, user.id); // user.id is already a string
  });

  // Configure deserialization
  passport.deserializeUser(async (id: string, done) => {
    console.log('[deserializeUser] Attempting to deserialize user with ID:', id);
    try {
      // getUserById now returns AuthenticatedUserPayload or null
      const user = await getUserById(id);
      if (!user) {
        console.error('[deserializeUser] User not found for ID:', id);
        return done(null, false);
      }
      console.log('[deserializeUser] Successfully deserialized user:', id);
      done(null, user); // user is already AuthenticatedUserPayload
    } catch (error) {
      console.error('[deserializeUser] Error deserializing user:', error);
      done(error);
    }
  });
}
