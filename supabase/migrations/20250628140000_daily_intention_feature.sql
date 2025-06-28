-- Daily Intention Feature Database Schema
-- Migration: 20250628140000_daily_intention_feature.sql

-- ===========================================
-- 1. CREATE BEINGS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS public.beings (
    being_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    label_en TEXT NOT NULL,
    label_he TEXT NOT NULL,
    created_by_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add updated_at trigger for beings table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_beings_updated_at 
    BEFORE UPDATE ON public.beings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- 2. CREATE DAILY INTENTION LOG TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS public.daily_intention_log (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    being_id UUID NOT NULL REFERENCES public.beings(being_id) ON DELETE CASCADE,
    selection_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- Ensure one selection per user per being per date
    UNIQUE(user_id, being_id, selection_date)
);

-- ===========================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- ===========================================

-- Index for efficient querying by user and date
CREATE INDEX IF NOT EXISTS idx_daily_intention_log_user_date 
    ON public.daily_intention_log(user_id, selection_date);

-- Index for efficient querying by user
CREATE INDEX IF NOT EXISTS idx_daily_intention_log_user_id 
    ON public.daily_intention_log(user_id);

-- Index for efficient querying by being
CREATE INDEX IF NOT EXISTS idx_daily_intention_log_being_id 
    ON public.daily_intention_log(being_id);

-- Index for beings by creator
CREATE INDEX IF NOT EXISTS idx_beings_created_by_user_id 
    ON public.beings(created_by_user_id);

-- Index for default beings
CREATE INDEX IF NOT EXISTS idx_beings_is_default 
    ON public.beings(is_default);

-- ===========================================
-- 4. INSERT DEFAULT BEINGS DATA
-- ===========================================

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
-- 5. CREATE DATABASE FUNCTIONS
-- ===========================================

-- Function to check if user needs to select beings for today
CREATE OR REPLACE FUNCTION public.needs_beings_selection(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    selection_count INTEGER;
BEGIN
    -- Check if user has any selections for today
    SELECT COUNT(*)
    INTO selection_count
    FROM public.daily_intention_log
    WHERE user_id = p_user_id 
    AND selection_date = CURRENT_DATE;
    
    -- Return true if no selections found (needs selection)
    RETURN selection_count = 0;
END;
$$;

-- Function to get beings for current user (default + user's custom)
CREATE OR REPLACE FUNCTION public.get_beings()
RETURNS TABLE(
    being_id UUID,
    label_en TEXT,
    label_he TEXT,
    is_default BOOLEAN,
    created_by_user_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.being_id,
        b.label_en,
        b.label_he,
        b.is_default,
        b.created_by_user_id
    FROM public.beings b
    WHERE b.is_default = true 
    OR b.created_by_user_id = auth.uid()
    ORDER BY b.is_default DESC, b.label_en ASC;
END;
$$;

-- Function to add a custom being for current user
CREATE OR REPLACE FUNCTION public.add_being(
    p_label_en TEXT,
    p_label_he TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_being_id UUID;
BEGIN
    -- Validate input
    IF p_label_en IS NULL OR trim(p_label_en) = '' THEN
        RAISE EXCEPTION 'English label cannot be empty';
    END IF;
    
    IF p_label_he IS NULL OR trim(p_label_he) = '' THEN
        RAISE EXCEPTION 'Hebrew label cannot be empty';
    END IF;
    
    -- Insert new being
    INSERT INTO public.beings (label_en, label_he, created_by_user_id, is_default)
    VALUES (trim(p_label_en), trim(p_label_he), auth.uid(), false)
    RETURNING being_id INTO new_being_id;
    
    RETURN new_being_id;
END;
$$;

-- Function to add daily intention selections
CREATE OR REPLACE FUNCTION public.add_daily_intention(p_being_ids UUID[])
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    being_id UUID;
    inserted_count INTEGER := 0;
BEGIN
    -- Validate input
    IF p_being_ids IS NULL OR array_length(p_being_ids, 1) IS NULL THEN
        RAISE EXCEPTION 'Being IDs array cannot be empty';
    END IF;
    
    -- Delete existing selections for today (allow re-selection)
    DELETE FROM public.daily_intention_log
    WHERE user_id = auth.uid() 
    AND selection_date = CURRENT_DATE;
    
    -- Insert new selections
    FOREACH being_id IN ARRAY p_being_ids
    LOOP
        -- Verify being exists and user has access
        IF EXISTS (
            SELECT 1 FROM public.beings b
            WHERE b.being_id = being_id
            AND (b.is_default = true OR b.created_by_user_id = auth.uid())
        ) THEN
            INSERT INTO public.daily_intention_log (user_id, being_id, selection_date)
            VALUES (auth.uid(), being_id, CURRENT_DATE)
            ON CONFLICT (user_id, being_id, selection_date) DO NOTHING;
            
            inserted_count := inserted_count + 1;
        END IF;
    END LOOP;
    
    RETURN inserted_count;
END;
$$;

-- Function to get daily intentions for current user
CREATE OR REPLACE FUNCTION public.get_daily_intentions(p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(
    being_id UUID,
    label_en TEXT,
    label_he TEXT,
    selection_date DATE,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.being_id,
        b.label_en,
        b.label_he,
        dil.selection_date,
        dil.created_at
    FROM public.daily_intention_log dil
    INNER JOIN public.beings b ON dil.being_id = b.being_id
    WHERE dil.user_id = auth.uid()
    AND dil.selection_date = COALESCE(p_date, CURRENT_DATE)
    ORDER BY dil.created_at ASC;
END;
$$;

-- Function to get intention statistics for user
CREATE OR REPLACE FUNCTION public.get_intention_stats(
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
    total_days INTEGER,
    days_with_selections INTEGER,
    most_selected_being_en TEXT,
    most_selected_being_he TEXT,
    selection_streak INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    streak_count INTEGER := 0;
    check_date DATE;
BEGIN
    -- Get basic stats
    SELECT 
        (p_end_date - p_start_date + 1)::INTEGER,
        COUNT(DISTINCT dil.selection_date)::INTEGER
    INTO total_days, days_with_selections
    FROM public.daily_intention_log dil
    WHERE dil.user_id = auth.uid()
    AND dil.selection_date BETWEEN p_start_date AND p_end_date;
    
    -- Get most selected being
    SELECT b.label_en, b.label_he
    INTO most_selected_being_en, most_selected_being_he
    FROM public.daily_intention_log dil
    INNER JOIN public.beings b ON dil.being_id = b.being_id
    WHERE dil.user_id = auth.uid()
    AND dil.selection_date BETWEEN p_start_date AND p_end_date
    GROUP BY b.being_id, b.label_en, b.label_he
    ORDER BY COUNT(*) DESC
    LIMIT 1;
    
    -- Calculate current streak (consecutive days with selections)
    check_date := CURRENT_DATE;
    WHILE EXISTS (
        SELECT 1 FROM public.daily_intention_log dil
        WHERE dil.user_id = auth.uid()
        AND dil.selection_date = check_date
    ) LOOP
        streak_count := streak_count + 1;
        check_date := check_date - INTERVAL '1 day';
    END LOOP;
    
    selection_streak := streak_count;
    
    RETURN NEXT;
END;
$$;

-- ===========================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ===========================================

-- Enable RLS on both tables
ALTER TABLE public.beings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_intention_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for beings table
CREATE POLICY "Users can read default beings" ON public.beings
    FOR SELECT USING (is_default = true);

CREATE POLICY "Users can read their own custom beings" ON public.beings
    FOR SELECT USING (created_by_user_id = auth.uid());

CREATE POLICY "Users can insert their own beings" ON public.beings
    FOR INSERT WITH CHECK (created_by_user_id = auth.uid() AND is_default = false);

CREATE POLICY "Users can update their own beings" ON public.beings
    FOR UPDATE USING (created_by_user_id = auth.uid() AND is_default = false);

CREATE POLICY "Users can delete their own beings" ON public.beings
    FOR DELETE USING (created_by_user_id = auth.uid() AND is_default = false);

-- RLS Policies for daily_intention_log table
CREATE POLICY "Users can read their own intention logs" ON public.daily_intention_log
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own intention logs" ON public.daily_intention_log
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own intention logs" ON public.daily_intention_log
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own intention logs" ON public.daily_intention_log
    FOR DELETE USING (user_id = auth.uid());

-- ===========================================
-- 7. GRANT PERMISSIONS
-- ===========================================

-- Grant execute permissions on functions to authenticated users
GRANT EXECUTE ON FUNCTION public.needs_beings_selection(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_beings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_being(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_daily_intention(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_daily_intentions(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_intention_stats(DATE, DATE) TO authenticated;

-- Grant table permissions to authenticated users
GRANT SELECT ON public.beings TO authenticated;
GRANT INSERT ON public.beings TO authenticated;
GRANT UPDATE ON public.beings TO authenticated;
GRANT DELETE ON public.beings TO authenticated;

GRANT SELECT ON public.daily_intention_log TO authenticated;
GRANT INSERT ON public.daily_intention_log TO authenticated;
GRANT UPDATE ON public.daily_intention_log TO authenticated;
GRANT DELETE ON public.daily_intention_log TO authenticated;

-- ===========================================
-- 8. COMMENTS FOR DOCUMENTATION
-- ===========================================

COMMENT ON TABLE public.beings IS 'Stores being definitions (character traits, values, intentions) for daily selection';
COMMENT ON TABLE public.daily_intention_log IS 'Logs daily being selections by users';

COMMENT ON FUNCTION public.needs_beings_selection(UUID) IS 'Checks if user needs to select beings for current date';
COMMENT ON FUNCTION public.get_beings() IS 'Returns all beings available to current user (default + custom)';
COMMENT ON FUNCTION public.add_being(TEXT, TEXT) IS 'Creates a new custom being for current user';
COMMENT ON FUNCTION public.add_daily_intention(UUID[]) IS 'Records daily being selections for current user';
COMMENT ON FUNCTION public.get_daily_intentions(DATE) IS 'Returns being selections for current user and specified date';
COMMENT ON FUNCTION public.get_intention_stats(DATE, DATE) IS 'Returns intention statistics for current user within date range';