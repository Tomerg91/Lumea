# 🗄️ Supabase Setup Guide for SatyaCoaching

Complete guide to set up your Supabase backend for the SatyaCoaching platform.

## 📋 Prerequisites

- [Supabase account](https://supabase.com) (free tier available)
- Access to your SatyaCoaching codebase
- Basic understanding of SQL and database concepts

## 🚀 Step 1: Create Supabase Project

### 1.1 Create New Project
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Fill in project details:
   - **Name**: `satya-coaching` or `lumea-coaching`
   - **Organization**: Your organization/personal account
   - **Database Password**: Generate a strong password (save it securely!)
   - **Region**: Choose closest to your users (US East for global, EU for Europe)
4. Wait 2-3 minutes for project creation

### 1.2 Get Project Credentials
Once created, go to **Settings** → **API** and copy:
- **Project URL**: `https://YOUR_PROJECT_REF.supabase.co`
- **Anon/Public Key**: `eyJhb...` (starts with eyJhb)
- **Service Role Key**: `eyJhb...` (keep this secret!)

## 🔧 Step 2: Set Up Database Schema

### 2.1 Core Tables Setup
1. Go to **SQL Editor** in your Supabase dashboard
2. Create a new query and run this SQL:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Run the complete schema setup
```

3. Copy and paste the contents of `/supabase-schema.sql` from your project
4. Click **RUN** to execute the schema

### 2.2 Daily Intentions Feature (Optional but Recommended)
1. In SQL Editor, create another new query
2. Copy and paste the contents of `/supabase/migrations/20250628140000_daily_intention_feature.sql`
3. Click **RUN** to add the daily intentions feature

### 2.3 Verify Tables Created
Go to **Table Editor** and verify these tables exist:
- ✅ `profiles` - User profiles extending auth.users
- ✅ `sessions` - Coaching sessions
- ✅ `reflections` - Client reflections and insights
- ✅ `resources` - Coaching resources and materials
- ✅ `notifications` - System notifications
- ✅ `beings` - Daily intention beings/values
- ✅ `daily_intention_log` - Daily intention selections

## 🔐 Step 3: Configure Authentication

### 3.1 Enable Auth Providers
Go to **Authentication** → **Providers**:

**Email (Required):**
- ✅ Enable email authentication
- ✅ Enable email confirmations
- ✅ Set confirmation email template (optional)

**Social Providers (Optional):**
- Google OAuth (recommended for Israeli users)
- GitHub (for coaches who are developers)

### 3.2 Auth Settings
Go to **Authentication** → **Settings**:
- **Site URL**: `http://localhost:5173` (for development)
- **Redirect URLs**: 
  - `http://localhost:5173/**`
  - `https://YOUR_VERCEL_URL.vercel.app/**` (for production)

### 3.3 Email Templates (Hebrew Support)
Go to **Authentication** → **Email Templates** and update:

**Confirm Signup (Hebrew):**
```html
<h2>שלום {{ .Name }},</h2>
<p>תודה על ההרשמה למערכת לומיאה! אנא לחץ על הקישור הבא כדי לאמת את כתובת האימייל שלך:</p>
<p><a href="{{ .ConfirmationURL }}">אמת את כתובת האימייל שלך</a></p>
<p>בברכה,<br>צוות לומיאה</p>
```

## 🔒 Step 4: Set Up Row Level Security (RLS)

RLS is already configured in the schema, but verify these policies exist:

### 4.1 Profiles Policies
- Users can view all profiles (public)
- Users can insert/update only their own profile
- Automatic profile creation on signup

### 4.2 Sessions Policies  
- Users can only see sessions they participate in (coach or client)
- Only coaches can create/modify sessions

### 4.3 Reflections Policies
- Clients can see their own reflections
- Coaches can see non-private client reflections
- Privacy controls implemented

## 💾 Step 5: Set Up Storage (Optional)

For file uploads (audio reflections, profile pictures):

### 5.1 Create Storage Buckets
Go to **Storage** and create buckets:
- `avatars` - Profile pictures (public)
- `audio-reflections` - Audio files (private)
- `resources` - Coaching materials (coach-controlled)

### 5.2 Set Bucket Policies
```sql
-- Avatar uploads (public read, auth write)
CREATE POLICY "Avatar uploads are publicly accessible" ON storage.objects 
FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatars" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Audio reflections (private)
CREATE POLICY "Users can view their own audio reflections" ON storage.objects 
FOR SELECT USING (bucket_id = 'audio-reflections' AND auth.uid()::text = (storage.foldername(name))[1]);
```

## ⚙️ Step 6: Environment Variables Setup

### 6.1 For Local Development
Create `.env.local` in your client folder:
```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 6.2 For Vercel Deployment
In your Vercel dashboard, add environment variables:
- `VITE_SUPABASE_URL` = `https://YOUR_PROJECT_REF.supabase.co`
- `VITE_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## 🧪 Step 7: Test Your Setup

### 7.1 Test Connection
1. Start your development server: `npm run dev`
2. Check browser console for connection messages
3. Try registering a new user
4. Verify profile is created automatically

### 7.2 Test Core Features
Create test accounts:
```sql
-- Test coach (run after creating auth user)
UPDATE profiles SET role = 'coach' WHERE email = 'test.coach@example.com';

-- Test client (run after creating auth user)  
UPDATE profiles SET role = 'client' WHERE email = 'test.client@example.com';
```

### 7.3 Test Daily Intentions
1. Login as any user
2. Navigate to intentions page
3. Select 2-3 beings for today
4. Verify selections are saved
5. Check that user doesn't need to re-select

## 📊 Step 8: Set Up Analytics (Optional)

### 8.1 Enable Realtime
Go to **Database** → **Replication** and enable realtime for:
- `sessions` - Live session updates
- `notifications` - Real-time notifications
- `daily_intention_log` - Live intention updates

### 8.2 Set Up Database Webhooks
For external integrations:
- Session confirmations → Email service
- New reflections → Analytics service
- Payment events → Stripe integration

## 🔍 Step 9: Monitoring & Maintenance

### 9.1 Set Up Alerts
Go to **Settings** → **Alerts**:
- Database CPU usage > 80%
- Storage usage > 80%
- API requests > rate limit
- Authentication failures spike

### 9.2 Database Backups
- ✅ Daily backups (enabled by default)
- ✅ Point-in-time recovery (enabled)
- 📅 Set up backup retention policy

### 9.3 Performance Optimization
Monitor these metrics:
- **Database** → **Reports** for slow queries
- **API** → **Logs** for error patterns
- **Authentication** → **Logs** for auth issues

## 🛡️ Step 10: Security Checklist

### 10.1 Production Security
- [ ] RLS enabled on all tables
- [ ] Service role key secured (never expose)
- [ ] HTTPS enforced in production
- [ ] Rate limiting configured
- [ ] Email confirmations enabled

### 10.2 HIPAA Compliance (for health coaching)
- [ ] Data encryption at rest (enabled by default)
- [ ] Audit logging enabled
- [ ] User consent management implemented
- [ ] Data retention policies set
- [ ] Regular security audits scheduled

## 🆘 Troubleshooting

### Common Issues

**Connection Errors:**
```
Error: Invalid API key
```
✅ **Solution**: Check environment variables are correctly set

**RLS Policy Errors:**
```
Error: new row violates row-level security policy
```
✅ **Solution**: Verify user is authenticated and policies allow the operation

**Migration Errors:**
```
Error: relation "profiles" already exists
```
✅ **Solution**: Use `CREATE TABLE IF NOT EXISTS` or drop existing tables first

### Debug Mode
Enable debug logging in your app:
```typescript
if (import.meta.env.DEV) {
  console.log('[Supabase] Debug mode enabled');
}
```

## 📞 Support

- **Supabase Docs**: [https://supabase.com/docs](https://supabase.com/docs)
- **Community**: [https://github.com/supabase/supabase/discussions](https://github.com/supabase/supabase/discussions)
- **Discord**: [Supabase Discord](https://discord.supabase.com/)

## 🎯 Next Steps

After Supabase setup:
1. ✅ Complete Vercel deployment
2. 🔧 Set up Stripe for payments
3. 📧 Configure email service (SendGrid/Resend)
4. 📱 Test mobile app functionality
5. 🚀 Launch to production!

---

## 📋 Quick Reference

### Essential URLs
- **Dashboard**: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`
- **API URL**: `https://YOUR_PROJECT_REF.supabase.co`
- **Database**: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF/editor`

### Essential Commands
```sql
-- Check user authentication
SELECT auth.uid(), auth.jwt();

-- Check user profile
SELECT * FROM profiles WHERE id = auth.uid();

-- Check daily intentions
SELECT * FROM get_daily_intentions();

-- Check if user needs selection
SELECT needs_beings_selection(auth.uid());
```

Your Supabase backend is now ready for the SatyaCoaching platform! 🎉