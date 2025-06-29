-- SatyaCoaching Supabase Quick Setup
-- Copy and paste this entire script into your Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- 1. CORE TABLES
-- ===========================================

-- Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  name TEXT,
  role TEXT CHECK (role IN ('client', 'coach', 'admin')) DEFAULT 'client',
  avatar_url TEXT,
  phone TEXT,
  bio TEXT,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create sessions table
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES public.profiles(id) NOT NULL,
  client_id UUID REFERENCES public.profiles(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  status TEXT CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')) DEFAULT 'scheduled',
  meeting_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create reflections table
CREATE TABLE IF NOT EXISTS public.reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.profiles(id) NOT NULL,
  session_id UUID REFERENCES public.sessions(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  mood_rating INTEGER CHECK (mood_rating >= 1 AND mood_rating <= 10),
  energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 10),
  insights TEXT[],
  goals TEXT[],
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create resources table
CREATE TABLE IF NOT EXISTS public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  resource_type TEXT CHECK (resource_type IN ('article', 'video', 'audio', 'pdf', 'link', 'exercise')) DEFAULT 'article',
  category TEXT,
  tags TEXT[],
  file_url TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT CHECK (type IN ('session_reminder', 'session_confirmation', 'session_cancelled', 'session_rescheduled', 'cancellation_request', 'reschedule_request', 'reflection_submitted', 'feedback_request')) NOT NULL,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  status TEXT CHECK (status IN ('sent', 'delivered', 'read', 'failed')) DEFAULT 'sent',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE
);

-- ===========================================
-- 2. DAILY INTENTIONS FEATURE
-- ===========================================

-- Create beings table
CREATE TABLE IF NOT EXISTS public.beings (
    being_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    label_en TEXT NOT NULL,
    label_he TEXT NOT NULL,
    created_by_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create daily intention log table
CREATE TABLE IF NOT EXISTS public.daily_intention_log (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    being_id UUID NOT NULL REFERENCES public.beings(being_id) ON DELETE CASCADE,
    selection_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, being_id, selection_date)
);

-- ===========================================
-- 3. ENABLE ROW LEVEL SECURITY
-- ===========================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_intention_log ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- 4. CREATE RLS POLICIES
-- ===========================================

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles
  FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Sessions policies
CREATE POLICY "Users can view sessions they are part of" ON public.sessions
  FOR SELECT USING (auth.uid() = coach_id OR auth.uid() = client_id);
CREATE POLICY "Coaches can insert sessions" ON public.sessions
  FOR INSERT WITH CHECK (auth.uid() = coach_id);
CREATE POLICY "Coaches can update their sessions" ON public.sessions
  FOR UPDATE USING (auth.uid() = coach_id);

-- Reflections policies
CREATE POLICY "Users can view their own reflections" ON public.reflections
  FOR SELECT USING (auth.uid() = client_id);
CREATE POLICY "Coaches can view client reflections if not private" ON public.reflections
  FOR SELECT USING (
    is_private = false AND 
    EXISTS (
      SELECT 1 FROM public.sessions s 
      WHERE s.client_id = reflections.client_id 
      AND s.coach_id = auth.uid()
    )
  );
CREATE POLICY "Clients can insert their own reflections" ON public.reflections
  FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Clients can update their own reflections" ON public.reflections
  FOR UPDATE USING (auth.uid() = client_id);

-- Resources policies
CREATE POLICY "Public resources are viewable by everyone" ON public.resources
  FOR SELECT USING (is_public = true);
CREATE POLICY "Users can view their own resources" ON public.resources
  FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "Coaches can create resources" ON public.resources
  FOR INSERT WITH CHECK (
    auth.uid() = created_by AND 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'coach')
  );
CREATE POLICY "Users can update their own resources" ON public.resources
  FOR UPDATE USING (auth.uid() = created_by);

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Beings policies
CREATE POLICY "Users can read default beings" ON public.beings
    FOR SELECT USING (is_default = true);
CREATE POLICY "Users can read their own custom beings" ON public.beings
    FOR SELECT USING (created_by_user_id = auth.uid());
CREATE POLICY "Users can insert their own beings" ON public.beings
    FOR INSERT WITH CHECK (created_by_user_id = auth.uid() AND is_default = false);

-- Daily intention log policies
CREATE POLICY "Users can read their own intention logs" ON public.daily_intention_log
    FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert their own intention logs" ON public.daily_intention_log
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- ===========================================
-- 5. CREATE FUNCTIONS AND TRIGGERS
-- ===========================================

-- Function to automatically create a profile for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  RETURN new;
END;
$$ language plpgsql security definer;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ language plpgsql;

-- Updated_at triggers
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.reflections
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.resources
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Function to check if user needs to select beings for today
CREATE OR REPLACE FUNCTION public.needs_beings_selection(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    selection_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO selection_count
    FROM public.daily_intention_log
    WHERE user_id = p_user_id 
    AND selection_date = CURRENT_DATE;
    
    RETURN selection_count = 0;
END;
$$;

-- ===========================================
-- 6. INSERT DEFAULT DATA
-- ===========================================

-- Insert default beings for daily intentions
INSERT INTO public.beings (label_en, label_he, is_default) VALUES
    ('Compassion', 'חמלה', true),
    ('Wisdom', 'חכמה', true),
    ('Courage', 'אומץ', true),
    ('Patience', 'סבלנות', true),
    ('Joy', 'שמחה', true),
    ('Peace', 'שלום', true),
    ('Love', 'אהבה', true),
    ('Gratitude', 'הכרת תודה', true),
    ('Mindfulness', 'קשיבות', true),
    ('Strength', 'כוח', true),
    ('Creativity', 'יצירתיות', true),
    ('Balance', 'איזון', true),
    ('Trust', 'אמון', true),
    ('Forgiveness', 'סליחה', true),
    ('Acceptance', 'קבלה', true),
    ('Clarity', 'בהירות', true),
    ('Purpose', 'מטרה', true),
    ('Resilience', 'עמידות', true),
    ('Authenticity', 'אותנטיות', true),
    ('Connection', 'חיבור', true)
ON CONFLICT DO NOTHING;

-- ===========================================
-- 7. CREATE INDEXES FOR PERFORMANCE
-- ===========================================

CREATE INDEX IF NOT EXISTS idx_sessions_coach_id ON public.sessions(coach_id);
CREATE INDEX IF NOT EXISTS idx_sessions_client_id ON public.sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_sessions_scheduled_at ON public.sessions(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_reflections_client_id ON public.reflections(client_id);
CREATE INDEX IF NOT EXISTS idx_reflections_session_id ON public.reflections(session_id);
CREATE INDEX IF NOT EXISTS idx_resources_created_by ON public.resources(created_by);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_intention_log_user_date ON public.daily_intention_log(user_id, selection_date);

-- ===========================================
-- 8. GRANT PERMISSIONS
-- ===========================================

-- Grant permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Success message
SELECT 'SatyaCoaching Supabase setup completed successfully! 🎉' as status;