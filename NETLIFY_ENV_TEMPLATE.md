# Netlify Environment Variables Template

Add these variables in your Netlify dashboard: 
**Site Settings → Environment Variables**

## 🔗 Backend API Connection (REQUIRED)

```bash
# Railway Backend URLs (update after Railway deployment)
VITE_API_URL=https://your-app-name.railway.app/api
VITE_RAILWAY_API_URL=https://your-app-name.railway.app
```

## 🗄️ Supabase Database (REQUIRED)

```bash
# Supabase Configuration (same project as Railway)
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 🔐 Authentication (Optional)

```bash
# OAuth Providers
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id
VITE_FACEBOOK_CLIENT_ID=your-facebook-app-id
```

## 💳 Payment Processing (Optional)

```bash
# Stripe Public Key
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_... # or pk_test_ for testing
```

## 📊 Analytics & Monitoring (Optional)

```bash
# Error Tracking
VITE_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# Google Analytics
VITE_GA_MEASUREMENT_ID=G-YOUR-GA-ID

# Hotjar (Optional)
VITE_HOTJAR_ID=your-hotjar-site-id
```

## ⚙️ Feature Flags (Optional)

```bash
# Development Features
VITE_ENABLE_PERFORMANCE_MONITORING=true
VITE_ENABLE_DEBUG_MODE=false

# Production Settings
NODE_ENV=production
```

---

## 📝 Setup Instructions

### 1. **Get Railway Backend URL:**
   - Deploy Railway backend first
   - Note the Railway URL (e.g., `https://your-app.railway.app`)
   - Update `VITE_API_URL` and `VITE_RAILWAY_API_URL`

### 2. **Get Supabase Credentials:**
   - Use the **same Supabase project** as Railway
   - Settings → API → anon/public key (NOT service role)
   - Settings → API → Project URL

### 3. **Configure OAuth (Optional):**
   
   **Google OAuth:**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create OAuth 2.0 credentials
   - Add your Netlify domain to authorized origins
   
   **Facebook OAuth:**
   - Go to [Facebook Developers](https://developers.facebook.com)
   - Create app and get App ID
   - Add your Netlify domain to valid OAuth redirect URIs

### 4. **Set Up Analytics (Optional):**
   
   **Sentry:**
   - Create project at [sentry.io](https://sentry.io)
   - Get DSN from project settings
   
   **Google Analytics:**
   - Create property at [analytics.google.com](https://analytics.google.com)
   - Get Measurement ID

### 5. **Update netlify.toml:**
   After getting Railway URL, the `netlify.toml` will automatically use `VITE_RAILWAY_API_URL` for API proxy.

## 🔄 Deployment Order

1. **First**: Set up Railway with backend environment variables
2. **Second**: Get Railway URL and update Netlify environment variables
3. **Third**: Deploy Netlify frontend
4. **Fourth**: Update Railway CORS settings with Netlify URL

## 🛠️ Testing Your Setup

After deployment, test the connection:

```bash
# Run health check script
npm run check:deployment

# Or manually test:
curl https://your-app.railway.app/api/health
curl https://your-app.netlify.app
```