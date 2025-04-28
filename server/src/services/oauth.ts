import { OAuth2Client } from 'google-auth-library';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User, IUser } from '../models/User.js';
import { getUserByEmail, createUser } from '../storage.js';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const facebookClient = new OAuth2Client(process.env.FACEBOOK_CLIENT_ID);

export async function verifyGoogleToken(token: string) {
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload) throw new Error('Invalid token');

    return {
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    };
  } catch (error) {
    console.error('Google token verification error:', error);
    throw error;
  }
}

export async function verifyFacebookToken(token: string) {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/me?fields=id,name,email,picture&access_token=${token}`
    );
    const data = await response.json();
    if (!data.email) throw new Error('No email found');

    return {
      email: data.email,
      name: data.name,
      picture: data.picture?.data?.url,
    };
  } catch (error) {
    console.error('Facebook token verification error:', error);
    throw error;
  }
}

export async function handleOAuthLogin(
  provider: 'google' | 'facebook',
  email: string,
  name: string,
  picture?: string
) {
  try {
    // Check if user exists using Mongoose storage function
    let user = await getUserByEmail(email);

    if (!user) {
      // Create new user using Mongoose storage function
      console.log(`[OAuth] Creating new user via ${provider} for email: ${email}`);
      // Generate a temporary random password as Mongoose schema requires it
      // OAuth users typically don't use passwords directly, but the model needs one.
      // The createUser function handles hashing.
      const temporaryPassword = crypto.randomBytes(20).toString('hex'); 
      
      user = await createUser({
        name,
        email,
        password: temporaryPassword, 
        role: 'client', // Default to client role for OAuth signups
        // Add other fields if needed, e.g., profile picture
        // profilePictureUrl: picture 
      });
      console.log(`[OAuth] New user created with ID: ${user._id}`);
    } else {
      console.log(`[OAuth] Existing user found via ${provider}: ${user._id}`);
      // Potential future step: Update user profile picture if it changed
      // if (picture && user.profilePictureUrl !== picture) {
      //   await User.findByIdAndUpdate(user._id, { profilePictureUrl: picture });
      // }
    }

    // Return the Mongoose user document (or a DTO)
    // Ensure sensitive fields like passwordHash/passwordSalt are not returned
    const userObject = user.toObject ? user.toObject() : { ...user }; // Handle potential plain object return from createUser
    delete userObject.passwordHash;
    delete userObject.passwordSalt;
    
    return userObject; 
    
  } catch (error) {
    console.error(`[OAuth] ${provider} login error for email ${email}:`, error);
    // Don't rethrow generic error, maybe return null or specific error type
    // throw error; 
    return null; // Indicate failure
  }
} 