import jwt, { SignOptions, Secret, JwtPayload } from 'jsonwebtoken';
import mongoose, { Types } from 'mongoose';
import { jwtConfig } from './config';
import { Session } from '../models/Session.js'; // Adjust path as needed
import crypto from 'crypto'; // For generating refresh token jti

// Define the structure of the payload for clarity
interface ITokenPayload {
  sub: Types.ObjectId | string; // User ID
  role?: string; // Optional: User role name
  type: 'access' | 'refresh';
  // jti?: string;              // Optional: JWT ID, useful for refresh token invalidation
}

interface IGeneratedTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Generates both access and refresh tokens for a user.
 * Creates a Session entry for the refresh token.
 */
export const generateTokens = async (
  userId: Types.ObjectId,
  userRole?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<IGeneratedTokens> => {
  // 1. Generate Access Token
  const accessPayload: ITokenPayload = {
    sub: userId.toString(), // Ensure sub is always string for JWT standard
    role: userRole,
    type: 'access',
  };
  // Explicitly type options
  const accessOptions: SignOptions = {
    // @ts-expect-error - Type mismatch for expiresIn with current types, but functionally correct.
    expiresIn: jwtConfig.accessExpiresIn,
  };
  // Cast payload to any to bypass strict type checking for sign function if necessary
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const accessToken = jwt.sign(
    accessPayload as any,
    jwtConfig.accessSecret as Secret,
    accessOptions
  );

  // 2. Generate Refresh Token
  const refreshTokenId = crypto.randomBytes(16).toString('hex'); // Unique ID for this refresh token
  const refreshPayload: ITokenPayload = {
    sub: userId.toString(), // Ensure sub is always string
    type: 'refresh',
  };
  // Explicitly type options
  const refreshOptions: SignOptions = {
    // @ts-expect-error - Type mismatch for expiresIn with current types, but functionally correct.
    expiresIn: jwtConfig.refreshExpiresIn,
    jwtid: refreshTokenId, // Standard claim for JWT ID
  };
  // Cast payload to any here as well
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const refreshToken = jwt.sign(
    refreshPayload as any,
    jwtConfig.refreshSecret as Secret,
    refreshOptions
  );

  // 3. Store Refresh Token reference in the database
  const expiresAt = new Date();
  const durationSeconds = parseDuration(jwtConfig.refreshExpiresIn);
  if (durationSeconds) {
    expiresAt.setSeconds(expiresAt.getSeconds() + durationSeconds);
  } else {
    console.warn(
      `Could not parse refresh token duration: ${jwtConfig.refreshExpiresIn}. Defaulting to 30 days.`
    );
    expiresAt.setDate(expiresAt.getDate() + 30); // Default to 30 days
  }

  try {
    await Session.create({
      user: userId,
      refreshToken: refreshTokenId, // Store the JTI (unique ID)
      expiresAt: expiresAt,
      ipAddress: ipAddress,
      userAgent: userAgent,
    });
  } catch (error) {
    console.error('Error saving refresh token session:', error);
    throw new Error('Failed to save user session.');
  }

  return { accessToken, refreshToken };
};

/**
 * Verifies a refresh token against the database.
 */
export const verifyRefreshToken = async (token: string): Promise<Types.ObjectId | null> => {
  let decoded: JwtPayload | string; // To hold decoded payload outside try block for error handling
  try {
    decoded = jwt.verify(token, jwtConfig.refreshSecret as Secret); // Assert secret type

    // Type guard to ensure decoded is an object (JwtPayload)
    if (typeof decoded === 'string' || !decoded.sub || !decoded.jti || decoded.type !== 'refresh') {
      console.warn('Invalid refresh token payload structure or type:', decoded);
      return null;
    }

    // Validate if sub is a valid ObjectId string BEFORE querying
    if (!mongoose.Types.ObjectId.isValid(decoded.sub)) {
      console.warn('Invalid ObjectId format in refresh token subject (sub):', decoded.sub);
      return null;
    }
    const userId = new Types.ObjectId(decoded.sub); // Convert string sub to ObjectId

    const session = await Session.findOne({
      user: userId,
      refreshToken: decoded.jti, // Match the unique ID (JTI)
      expiresAt: { $gt: new Date() }, // Ensure it hasn't expired
      revokedAt: { $exists: false }, // Ensure it hasn't been revoked
    });

    if (!session) {
      console.log(
        `Refresh token session not found or invalid for user ${userId}, jti ${decoded.jti}`
      );
      return null;
    }

    // Token is valid and session exists
    return userId;
  } catch (error) {
    // Use the decoded object captured before the error (if verification itself failed but parsing succeeded partly)
    // Need to be careful as 'decoded' might not be populated if jwt.verify threw early
    const potentialJti = typeof decoded === 'object' && decoded?.jti ? decoded.jti : undefined;

    if (error instanceof jwt.TokenExpiredError) {
      console.log('Refresh token expired:', error.message);
      // Clean up expired token from DB if we have the JTI
      if (potentialJti) {
        console.log(`Attempting to remove expired session with jti: ${potentialJti}`);
        await Session.deleteOne({ refreshToken: potentialJti }).catch((err) =>
          console.error('Error deleting expired session:', err)
        );
      }
    } else if (error instanceof jwt.JsonWebTokenError) {
      console.log('Invalid refresh token:', error.message);
    } else {
      console.error('Error verifying refresh token:', error);
    }

    return null;
  }
};

/**
 * Invalidates a specific refresh token session.
 */
export const invalidateRefreshToken = async (
  userId: Types.ObjectId,
  refreshTokenJti: string
): Promise<boolean> => {
  try {
    const result = await Session.updateOne(
      { user: userId, refreshToken: refreshTokenJti, revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date() } }
    );
    return result.modifiedCount > 0;
  } catch (error) {
    console.error('Error invalidating refresh token:', error);
    return false;
  }
};

/**
 * Invalidates ALL refresh token sessions for a user.
 */
export const invalidateAllUserSessions = async (userId: Types.ObjectId): Promise<boolean> => {
  try {
    // Instead of deleting, mark all as revoked for audit trail
    const result = await Session.updateMany(
      { user: userId, revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date() } }
    );
    console.log(`Invalidated ${result.modifiedCount} sessions for user ${userId}`);
    return result.modifiedCount > 0;
  } catch (error) {
    console.error(`Error invalidating sessions for user ${userId}:`, error);
    return false;
  }
};

// Helper to parse duration string (e.g., "15m", "30d") into seconds
// Basic implementation, consider using a library like 'ms' for robustness
function parseDuration(durationStr: string): number | null {
  const match = durationStr.match(/^(\d+)(s|m|h|d|w|y)$/);
  if (!match) return null;

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 60 * 60;
    case 'd':
      return value * 60 * 60 * 24;
    case 'w':
      return value * 60 * 60 * 24 * 7;
    case 'y':
      return value * 60 * 60 * 24 * 365; // Approximate
    default:
      return null;
  }
}
