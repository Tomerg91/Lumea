import dotenv from 'dotenv';

dotenv.config(); // Load environment variables from .env file

export const jwtConfig = {
  accessSecret: process.env.JWT_ACCESS_SECRET || 'your_default_access_secret', // Use env var or a default (change!)
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'your_default_refresh_secret', // Use env var or a default (change!)
  accessExpiresIn: '15m', // 15 minutes
  refreshExpiresIn: '30d', // 30 days
};

if (
  process.env.NODE_ENV === 'production' &&
  (jwtConfig.accessSecret === 'your_default_access_secret' ||
    jwtConfig.refreshSecret === 'your_default_refresh_secret')
) {
  console.warn(
    'WARNING: Using default JWT secrets in production. Please set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET environment variables.'
  );
  // Consider throwing an error or exiting in production if secrets are not set
  // throw new Error('JWT secrets must be set in production environment.');
}
