import dotenv from 'dotenv';

dotenv.config(); // Load environment variables from .env file

// Set JWT fallbacks for Railway deployment
if (!process.env.JWT_ACCESS_SECRET && process.env.JWT_SECRET) {
  process.env.JWT_ACCESS_SECRET = process.env.JWT_SECRET;
}
if (!process.env.JWT_REFRESH_SECRET && process.env.JWT_SECRET) {
  process.env.JWT_REFRESH_SECRET = process.env.JWT_SECRET;
}

// Use defaults for development/testing if no secrets provided
const defaultAccessSecret = 'development_access_secret_change_in_production';
const defaultRefreshSecret = 'development_refresh_secret_change_in_production';

const accessSecret = process.env.JWT_ACCESS_SECRET || defaultAccessSecret;
const refreshSecret = process.env.JWT_REFRESH_SECRET || defaultRefreshSecret;

// Warn about missing or default JWT secrets (but don't exit)
if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
  console.warn('WARNING: JWT_ACCESS_SECRET and/or JWT_REFRESH_SECRET not set. Using development defaults.');
  console.warn('Set JWT_SECRET environment variable for automatic fallback, or set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET individually.');
}

// Warn about default values
if (accessSecret === 'your_default_access_secret' ||
    refreshSecret === 'your_default_refresh_secret' ||
    accessSecret === defaultAccessSecret ||
    refreshSecret === defaultRefreshSecret) {
  console.warn('WARNING: Default JWT secrets detected. Change them for production security.');
}

export const jwtConfig = {
  accessSecret,
  refreshSecret,
  accessExpiresIn: '15m', // 15 minutes
  refreshExpiresIn: '30d', // 30 days
};
