# Complete Deployment Setup Guide

## Architecture Overview

**SatyaCoaching** uses a modern three-tier architecture:
- **Frontend**: Netlify (React/Vite)
- **Backend API**: Railway (Node.js/Express) 
- **Database**: Supabase (PostgreSQL)

## Prerequisites

Before starting, ensure you have:
- [ ] GitHub repository with your code
- [ ] Netlify account
- [ ] Railway account  
- [ ] Supabase account
- [ ] Domain name (optional but recommended)

## Step 1: Supabase Database Setup

### 1.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose organization and name: `satyacoaching-prod`
4. Generate a strong database password
5. Select region closest to your users (Europe/US)

### 1.2 Configure Database Schema

```bash
# Run migrations in your Supabase project
supabase db reset --project-ref YOUR_PROJECT_REF
```

### 1.3 Get Supabase Credentials

From your Supabase dashboard:
- Project URL: `https://YOUR_PROJECT.supabase.co`
- Anon Key: `eyJhbGci...` (public, safe for frontend)
- Service Role Key: `eyJhbGci...` (secret, backend only)

## Step 2: Railway Backend Deployment

### 2.1 Connect Repository to Railway

1. Go to [railway.app](https://railway.app)
2. Click "Deploy from GitHub repo"
3. Select your repository
4. Choose "Deploy from a folder" → `server`

### 2.2 Configure Railway Build Settings

**Important**: The server uses `tsx` for direct TypeScript execution, avoiding compilation issues.

Railway will automatically detect the build process. If needed, configure:
- **Build Command**: `npm run build` (will echo success message)  
- **Start Command**: `npm start` (runs `tsx src/index.ts`)

### 2.3 Configure Railway Environment Variables

In Railway dashboard, add these environment variables:

```bash
# Database & Auth (REQUIRED)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci... # Service role key from Supabase

# JWT Secrets (Generate secure random strings)
JWT_SECRET=your-64-character-random-string-for-jwt-tokens
SESSION_SECRET=your-64-character-random-string-for-sessions

# CORS & Frontend
ALLOWED_ORIGINS=http://localhost:5173,https://your-app.netlify.app
FRONTEND_URL=https://your-app.netlify.app

# Environment
NODE_ENV=production
PORT=3001

# Email Service (Choose one)
# Option 1: SendGrid
SENDGRID_API_KEY=SG.your-sendgrid-api-key

# Option 2: SMTP (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Payment Processing (if needed)
STRIPE_SECRET_KEY=sk_live_... # or sk_test_ for testing
STRIPE_PUBLISHABLE_KEY=pk_live_... # or pk_test_ for testing
STRIPE_WEBHOOK_SECRET=whsec_...

# Redis (Railway Add-on or external)
REDIS_URL=redis://default:password@host:port

# Optional: Error Tracking
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_ENVIRONMENT=production

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

### 2.3 Deploy Railway Service

1. Railway will auto-deploy when you push to main branch
2. Note your Railway URL: `https://your-app.railway.app`
3. Test API: `https://your-app.railway.app/api/health`

## Step 3: Netlify Frontend Deployment

### 3.1 Connect Repository to Netlify

1. Go to [netlify.com](https://netlify.com)
2. Click "Add new site" → "Import from Git"
3. Select your repository
4. Netlify will auto-detect build settings from `netlify.toml`

### 3.2 Configure Netlify Environment Variables

In Netlify dashboard, go to Site Settings → Environment Variables:

```bash
# Backend API (REQUIRED)
VITE_API_URL=https://your-app.railway.app/api
VITE_RAILWAY_API_URL=https://your-app.railway.app

# Supabase (REQUIRED)
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci... # Anon key from Supabase

# OAuth (Optional)
VITE_GOOGLE_CLIENT_ID=your-google-client-id
VITE_FACEBOOK_CLIENT_ID=your-facebook-client-id

# Payments (Optional)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_... # or pk_test_

# Analytics (Optional)
VITE_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
VITE_GA_MEASUREMENT_ID=G-YOUR-GA-ID

# Production Settings
NODE_ENV=production
```

### 3.3 Update netlify.toml API Proxy

Update the API proxy URL in `netlify.toml`:

```toml
[[redirects]]
  from = "/api/*"
  to = "https://your-app.railway.app/api/:splat"
  status = 200
  force = true
```

### 3.4 Deploy Netlify Site

1. Netlify will auto-deploy when you push to main branch
2. Note your Netlify URL: `https://your-app.netlify.app`
3. Configure custom domain (optional)

## Step 4: Configure Custom Domain (Optional)

### 4.1 Netlify Custom Domain

1. In Netlify dashboard: Site Settings → Domain management
2. Add custom domain: `app.yourcoaching.com`
3. Configure DNS records as instructed

### 4.2 Update Environment Variables

Update these in both Railway and Netlify:
- `FRONTEND_URL=https://app.yourcoaching.com`
- `ALLOWED_ORIGINS=...,https://app.yourcoaching.com`

## Step 5: Testing & Verification

### 5.1 Health Checks

Test each service:

```bash
# Backend API Health
curl https://your-app.railway.app/api/health

# Frontend Load
curl https://your-app.netlify.app

# Database Connection
# Check Railway logs for successful DB connection
```

### 5.2 End-to-End Testing

1. **Registration**: Test user signup flow
2. **Authentication**: Test login/logout  
3. **API Calls**: Test frontend → backend → database
4. **File Upload**: Test file storage (if using)
5. **Email**: Test email notifications

## Step 6: Production Monitoring

### 6.1 Set Up Error Tracking

1. Create Sentry project
2. Add Sentry DSN to both Railway and Netlify
3. Monitor error rates and performance

### 6.2 Set Up Uptime Monitoring

1. Use UptimeRobot or similar
2. Monitor both frontend and backend endpoints
3. Set up alerts for downtime

### 6.3 Set Up Backup Strategy

1. Supabase handles database backups automatically
2. Consider additional backup for critical data
3. Test restoration procedures

## Environment Variables Quick Reference

### Netlify (Frontend)
```bash
VITE_API_URL=https://your-app.railway.app/api
VITE_RAILWAY_API_URL=https://your-app.railway.app
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
NODE_ENV=production
```

### Railway (Backend)
```bash
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
JWT_SECRET=your-64-character-random-string
SESSION_SECRET=your-64-character-random-string
FRONTEND_URL=https://your-app.netlify.app
ALLOWED_ORIGINS=http://localhost:5173,https://your-app.netlify.app
NODE_ENV=production
```

## Troubleshooting

### Common Issues

**Frontend shows white page:**
- Check browser console for errors
- Verify VITE_API_URL points to Railway backend
- Check Netlify build logs

**API calls fail with CORS error:**
- Verify ALLOWED_ORIGINS in Railway includes Netlify domain
- Check FRONTEND_URL setting

**Database connection fails:**
- Verify DATABASE_URL format
- Check Supabase connection limits
- Verify service role key permissions

**Build fails:**
- Check Node.js version compatibility
- Verify all dependencies are installed
- Check build command in netlify.toml

### Getting Help

1. Check service logs:
   - Netlify: Deploy logs in dashboard
   - Railway: Application logs in dashboard
   - Supabase: SQL editor for database queries

2. Monitor performance:
   - Sentry for error tracking
   - Netlify Analytics for frontend metrics
   - Railway metrics for backend performance

## Security Checklist

- [ ] Use HTTPS everywhere (auto with Netlify/Railway)
- [ ] Set strong JWT secrets (64+ characters)
- [ ] Configure CORS properly
- [ ] Use environment variables for all secrets
- [ ] Enable rate limiting on backend
- [ ] Set up Supabase RLS policies
- [ ] Configure CSP headers in Netlify
- [ ] Regular security audits with `npm audit`

## Next Steps

1. Set up CI/CD pipelines for automated testing
2. Configure staging environments for testing
3. Set up database migrations workflow
4. Plan backup and disaster recovery procedures
5. Monitor and optimize performance