import dotenv from 'dotenv';

dotenv.config(); // Load environment variables from .env file

// Validate required JWT secrets
if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
  console.error('FATAL ERROR: JWT_ACCESS_SECRET and JWT_REFRESH_SECRET environment variables are required');
  process.exit(1);
}

// Validate that secrets are not the old default values
if (process.env.JWT_ACCESS_SECRET === 'your_default_access_secret' ||
    process.env.JWT_REFRESH_SECRET === 'your_default_refresh_secret') {
  console.error('FATAL ERROR: Default JWT secrets detected. Change them immediately for security.');
  process.exit(1);
}

export const jwtConfig = {
  accessSecret: process.env.JWT_ACCESS_SECRET,
  refreshSecret: process.env.JWT_REFRESH_SECRET,
  accessExpiresIn: '15m', // 15 minutes
  refreshExpiresIn: '30d', // 30 days
};
