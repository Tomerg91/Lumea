# Security Setup Guide

## 🚨 CRITICAL: Complete These Steps Before Running the Application

### 1. Environment Variables Setup

Create a `.env` file in the `server/` directory with the following **REQUIRED** variables:

```bash
# Environment Configuration
NODE_ENV=development
PORT=3001
CLIENT_URL=http://localhost:5173

# Database Configuration
DATABASE_URL=mongodb://localhost:27017/satya-coaching

# JWT Configuration (REQUIRED - Generate secure random secrets)
JWT_ACCESS_SECRET=your_secure_random_access_secret_here
JWT_REFRESH_SECRET=your_secure_random_refresh_secret_here

# Session Configuration (REQUIRED - Generate secure random secret)
SESSION_SECRET=your_secure_random_session_secret_here

# Encryption Configuration (REQUIRED - Generate 32-byte hex key)
ENCRYPTION_KEY=your_32_byte_hex_encryption_key_here
```

### 2. Generate Secure Secrets

**NEVER use default values in production!** Generate secure secrets using:

```bash
# Generate JWT secrets (32 bytes each)
node -e "console.log('JWT_ACCESS_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# Generate session secret (32 bytes)
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# Generate encryption key (32 bytes)
node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Test Environment Setup

For running tests, also add:

```bash
# Test Credentials (Required for tests)
ADMIN_PASSWORD=your_secure_admin_test_password
COACH_PASSWORD=your_secure_coach_test_password
CLIENT_PASSWORD=your_secure_client_test_password
```

### 4. Production Security Checklist

- [ ] All environment variables use secure, unique values
- [ ] No default secrets are used
- [ ] CLIENT_URL is set to your production domain
- [ ] Database uses SSL/TLS encryption
- [ ] HTTPS is enabled for all connections
- [ ] Secrets are stored securely (e.g., AWS Secrets Manager, Azure Key Vault)
- [ ] Regular secret rotation is implemented

### 5. Migration Required

If you have existing encrypted data, run the migration script:

```bash
cd server
npm run migrate:encryption
```

This will:
- Re-encrypt all existing coach notes with secure random IVs
- Validate the migration was successful
- Provide a detailed report

### 6. Security Features Implemented

✅ **Fixed Critical Vulnerabilities:**
- Static IV encryption vulnerability (CRITICAL)
- Hardcoded default secrets (CRITICAL)
- Permissive CORS configuration (CRITICAL)
- Weak password requirements (CRITICAL)

✅ **Security Enhancements:**
- Random IV generation for each encryption operation
- Strong password requirements (12+ chars, complexity)
- Strict CORS origin validation
- Comprehensive environment variable validation
- Secure error handling
- Enhanced security headers

### 7. Password Requirements

New password policy enforces:
- Minimum 12 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (@$!%*?&)

### 8. Monitoring and Alerts

The application now includes:
- Security event logging
- Failed authentication tracking
- Suspicious activity detection
- Rate limiting protection

### 9. Emergency Response

If you suspect a security breach:
1. Immediately rotate all secrets
2. Check application logs for suspicious activity
3. Review user access patterns
4. Consider temporarily disabling affected features

### 10. Regular Security Maintenance

- Review and update dependencies monthly
- Rotate secrets quarterly
- Audit user permissions regularly
- Monitor security logs daily
- Test backup and recovery procedures

## 🔒 Remember: Security is an ongoing process, not a one-time setup! 