# Secrets Management for SatyaCoaching Platform

## Production Secrets Checklist

### Required Production Secrets
```bash
# Generate secure random secrets (32+ characters)
JWT_SECRET="$(openssl rand -base64 32)"
SESSION_SECRET="$(openssl rand -base64 32)"
ENCRYPTION_KEY="$(openssl rand -hex 32)"

# Database (Supabase Production)
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres"
SUPABASE_URL="https://[PROJECT].supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJ..."

# External Services
GOOGLE_CLIENT_ID="[PRODUCTION_GOOGLE_CLIENT_ID]"
GOOGLE_CLIENT_SECRET="[PRODUCTION_GOOGLE_CLIENT_SECRET]"
STRIPE_SECRET_KEY="sk_live_[PRODUCTION_STRIPE_KEY]"
SENDGRID_API_KEY="SG.[PRODUCTION_SENDGRID_KEY]"

# Monitoring
SENTRY_DSN="https://[KEY]@[PROJECT].ingest.sentry.io/[ID]"
```

### Staging Secrets
```bash
# Use test/staging versions of all production secrets
STRIPE_SECRET_KEY="sk_test_[STAGING_STRIPE_KEY]"
DATABASE_URL="[STAGING_DATABASE_URL]"
# ... other staging-specific secrets
```

## Secret Generation Commands

```bash
# Generate JWT Secret
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Generate Session Secret  
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Generate Encryption Key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Deployment Platforms

### Vercel
```bash
# Set production secrets
vercel env add JWT_SECRET production
vercel env add DATABASE_URL production
vercel env add STRIPE_SECRET_KEY production
```

### Docker/Docker Compose
```bash
# Use .env.production file (never commit to git)
# Set in deployment environment
```

### Cloud Providers
- AWS Secrets Manager
- Azure Key Vault  
- Google Secret Manager

## Security Best Practices

1. **Never commit secrets to git**
2. **Use different secrets for each environment**
3. **Rotate secrets regularly (every 90 days)**
4. **Use environment-specific service accounts**
5. **Monitor secret access and usage**
6. **Implement secret scanning in CI/CD**

## Secret Rotation Procedure

1. Generate new secret
2. Update staging environment  
3. Test staging thoroughly
4. Update production during maintenance window
5. Monitor for any issues
6. Revoke old secret after 24 hours 