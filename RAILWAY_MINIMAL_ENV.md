# Railway Minimal Environment Variables (For Initial Testing)

Set these **minimum** variables to get Railway working. You can add others later.

## 🚀 Quick Start (Copy to Railway Dashboard)

```bash
# Core Required
NODE_ENV=production
PORT=3001

# Minimal Security (CHANGE THESE!)
JWT_SECRET=temp_development_jwt_secret_change_immediately_in_production
SESSION_SECRET=temp_development_session_secret_change_immediately_in_production

# Minimal CORS (update with Netlify URL later)
FRONTEND_URL=https://localhost:3000
ALLOWED_ORIGINS=http://localhost:5173,https://localhost:3000
```

## ✅ Test Deployment

With just these variables, Railway should:
1. ✅ **Start successfully** (no fatal errors)
2. ✅ **Pass health check** at `/api/health`
3. ⚠️ **Show warnings** for missing database/services (expected)

## 🔄 Next Steps After Railway is Running

1. **Test health endpoint**: `https://your-app.railway.app/api/health`
2. **Add database**: Set up Supabase and add `DATABASE_URL`
3. **Add real secrets**: Generate secure JWT and session secrets
4. **Configure CORS**: Update with actual Netlify URL
5. **Add email service**: SendGrid or SMTP configuration

## 🔐 Generate Real Secrets

```bash
# Run locally to get secure secrets
npm run generate:secrets
```

Then replace the temp secrets with the generated ones.

---

**This minimal config gets Railway working quickly so you can test the deployment process!**