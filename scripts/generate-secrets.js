#!/usr/bin/env node

/**
 * Generate secure secrets for production deployment
 * Run with: node scripts/generate-secrets.js
 */

const crypto = require('crypto');

console.log('🔐 Generating secure secrets for SatyaCoaching deployment...\n');

// Generate random secrets
const jwtSecret = crypto.randomBytes(32).toString('hex');
const sessionSecret = crypto.randomBytes(32).toString('hex');
const encryptionKey = crypto.randomBytes(32).toString('hex');
const encryptionIV = crypto.randomBytes(16).toString('hex');

console.log('📋 Copy these values to your Railway environment variables:');
console.log('=' .repeat(60));
console.log(`JWT_SECRET=${jwtSecret}`);
console.log(`SESSION_SECRET=${sessionSecret}`);
console.log(`ENCRYPTION_KEY=${encryptionKey}`);
console.log(`ENCRYPTION_IV=${encryptionIV}`);
console.log('=' .repeat(60));

console.log('\n💡 Tips:');
console.log('- Keep these secrets secure and never commit them to version control');
console.log('- Use different secrets for staging and production environments');
console.log('- Store these in a password manager for team access');
console.log('- Rotate secrets periodically for enhanced security');

console.log('\n🚀 Next steps:');
console.log('1. Add these to Railway environment variables');
console.log('2. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
console.log('3. Configure FRONTEND_URL and ALLOWED_ORIGINS');
console.log('4. Set up email service (SENDGRID_API_KEY or SMTP settings)');
console.log('5. Deploy and test your backend');