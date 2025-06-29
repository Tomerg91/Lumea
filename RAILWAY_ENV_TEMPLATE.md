# Railway Environment Variables Template

Copy these variables to your Railway project dashboard.
Replace placeholder values with your actual credentials.

## 🔐 Security & Authentication (REQUIRED)

```bash
# Database Connection (from Supabase)
DATABASE_URL=postgresql://postgres:YOUR_SUPABASE_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# JWT & Session Secrets (generate secure 64-character strings)
# Use JWT_SECRET for simplicity (server will auto-map to JWT_ACCESS_SECRET & JWT_REFRESH_SECRET)
JWT_SECRET=REPLACE_WITH_64_CHARACTER_RANDOM_STRING
SESSION_SECRET=REPLACE_WITH_64_CHARACTER_RANDOM_STRING

# Alternative: Set individual JWT secrets (optional)
# JWT_ACCESS_SECRET=REPLACE_WITH_64_CHARACTER_RANDOM_STRING
# JWT_REFRESH_SECRET=REPLACE_WITH_64_CHARACTER_RANDOM_STRING

# Encryption Key (for sensitive data encryption - optional but recommended)
ENCRYPTION_KEY=REPLACE_WITH_64_CHARACTER_HEX_STRING

# Environment
NODE_ENV=production
PORT=3001
```

## 🌐 CORS & Frontend (REQUIRED)

```bash
# Frontend Configuration (update after Netlify deployment)
# Use FRONTEND_URL (server will auto-map to CLIENT_URL)
FRONTEND_URL=https://your-app-name.netlify.app
ALLOWED_ORIGINS=http://localhost:5173,https://your-app-name.netlify.app

# Alternative: Use CLIENT_URL directly (optional)
# CLIENT_URL=https://your-app-name.netlify.app
```

## 📧 Email Service (REQUIRED - Choose One)

### Option A: SendGrid (Recommended)
```bash
SENDGRID_API_KEY=SG.your_sendgrid_api_key_here
```

### Option B: Gmail SMTP
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
```

## 💳 Payment Processing (Optional)

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_... # or sk_test_ for testing
STRIPE_PUBLISHABLE_KEY=pk_live_... # or pk_test_ for testing
STRIPE_WEBHOOK_SECRET=whsec_...
```

## 📊 Monitoring & Error Tracking (Optional)

```bash
# Sentry Error Tracking
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_ENVIRONMENT=production

# Redis (if using Railway Redis add-on)
REDIS_URL=redis://default:password@host:port
```

## 🔒 Security Settings

```bash
# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# Feature Flags
ENABLE_AUDIT_LOGS=true
ENABLE_BACKGROUND_JOBS=true
```

---

## 📝 Setup Instructions

1. **Get Supabase Credentials:**
   - Go to your Supabase project dashboard
   - Settings → Database → Connection string (use "nodejs" format)
   - Settings → API → Service role key

2. **Generate Secure Secrets:**
   ```bash
   # Run in your local project
   npm run generate:secrets
   ```

3. **Set up Email Service:**
   - **SendGrid**: Create account at sendgrid.com, get API key
   - **Gmail**: Enable 2FA, create app-specific password

4. **Configure CORS:**
   - First deploy without CORS settings
   - Note your Railway URL (e.g., `https://your-app.railway.app`)
   - Update `FRONTEND_URL` and `ALLOWED_ORIGINS` after Netlify deployment

5. **Optional Services:**
   - **Stripe**: Get keys from stripe.com dashboard
   - **Sentry**: Create project at sentry.io
   - **Redis**: Add Railway Redis service