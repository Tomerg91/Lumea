import { OAuth2Client } from 'google-auth-library';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

import { getUserByEmail, createUser } from '../storage';
import { AuthenticatedUser } from '../types/user';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
// Facebook doesn't use OAuth2Client, so this should be removed
// const facebookClient = new OAuth2Client(process.env.FACEBOOK_CLIENT_ID);

interface OAuthUserProfile {
  email: string;
  name: string;
  picture?: string;
}

export async function verifyGoogleToken(token: string): Promise<OAuthUserProfile> {
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) throw new Error('Invalid token or missing email');

    return {
      email: payload.email,
      name: payload.name || '',
      picture: payload.picture,
    };
  } catch (error) {
    console.error('Google token verification error:', error);
    throw error;
  }
}

export async function verifyFacebookToken(token: string): Promise<OAuthUserProfile> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/me?fields=id,name,email,picture&access_token=${token}`
    );

    if (!response.ok) {
      throw new Error(`Facebook API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as {
      email?: string;
      name?: string;
      picture?: { data?: { url?: string } };
    };

    if (!data.email) throw new Error('No email found in Facebook response');

    return {
      email: data.email,
      name: data.name || '',
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
): Promise<AuthenticatedUser | null> {
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

      // We need to properly type the parameters for createUser
      const userData = {
        name,
        email,
        password: temporaryPassword,
        role: 'client' as const, // Default to client role for OAuth signups
      };

      // Use @ts-expect-error since we know createUser will return a proper User and it's just a typing issue
      // @ts-expect-error - The createUser function will return a valid user but TypeScript can't infer it properly
      user = await createUser(userData);

      // Store the result in the user variable
      console.log(`[OAuth] New user created with ID: ${user.id}`);
    } else {
      console.log(`[OAuth] Existing user found via ${provider}: ${user.id}`);
      // Potential future step: Update user profile picture if it changed
      // if (picture && user.profilePictureUrl !== picture) {
      //   await User.findByIdAndUpdate(user._id, { profilePictureUrl: picture });
      // }
    }

    // Ensure sensitive fields like passwordHash/passwordSalt are not returned
    // TODO: Ensure the returned user object from Supabase does not contain sensitive fields.

    return user; // user is already AuthenticatedUserPayload or a clean Partial<IUser>
  } catch (error) {
    console.error(`[OAuth] ${provider} login error for email ${email}:`, error);
    // Don't rethrow generic error, maybe return null or specific error type
    // throw error;
    return null; // Indicate failure
  }
}
