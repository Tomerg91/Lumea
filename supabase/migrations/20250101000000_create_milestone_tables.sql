-- Migration for Milestone System
-- Creates tables for milestones, milestone categories, and milestone progress

-- Create milestone_categories table
CREATE TABLE milestone_categories (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name varchar(255) NOT NULL,
    description text,
    color varchar(7) NOT NULL DEFAULT '#3B82F6', -- hex color
    icon varchar(50),
    coach_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    
    CONSTRAINT milestone_categories_name_coach_unique UNIQUE(name, coach_id)
);

-- Create milestones table
CREATE TABLE milestones (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title varchar(500) NOT NULL,
    description text,
    target_date timestamp with time zone,
    priority varchar(10) CHECK (priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
    status varchar(20) CHECK (status IN ('active', 'completed', 'paused', 'cancelled')) DEFAULT 'active',
    client_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    coach_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    category_id uuid REFERENCES milestone_categories(id) ON DELETE SET NULL,
    completed_at timestamp with time zone,
    notes text,
    tags text[] DEFAULT '{}',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create milestone_progress table
CREATE TABLE milestone_progress (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    milestone_id uuid NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
    progress_percent integer CHECK (progress_percent >= 0 AND progress_percent <= 100) DEFAULT 0,
    notes text,
    evidence text, -- URL to evidence/attachment
    session_id uuid REFERENCES coaching_sessions(id) ON DELETE SET NULL,
    recorded_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    recorded_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_milestone_categories_coach_id ON milestone_categories(coach_id);
CREATE INDEX idx_milestones_client_id ON milestones(client_id);
CREATE INDEX idx_milestones_coach_id ON milestones(coach_id);
CREATE INDEX idx_milestones_status ON milestones(status);
CREATE INDEX idx_milestones_target_date ON milestones(target_date);
CREATE INDEX idx_milestone_progress_milestone_id ON milestone_progress(milestone_id);
CREATE INDEX idx_milestone_progress_recorded_at ON milestone_progress(recorded_at);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_milestone_categories_updated_at 
    BEFORE UPDATE ON milestone_categories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_milestones_updated_at 
    BEFORE UPDATE ON milestones 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_milestone_progress_updated_at 
    BEFORE UPDATE ON milestone_progress 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE milestone_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestone_progress ENABLE ROW LEVEL SECURITY;

-- Milestone Categories Policies
-- Coaches can manage their own categories
CREATE POLICY "Coaches can view their own milestone categories" ON milestone_categories
    FOR SELECT USING (coach_id = auth.uid());

CREATE POLICY "Coaches can create their own milestone categories" ON milestone_categories
    FOR INSERT WITH CHECK (coach_id = auth.uid());

CREATE POLICY "Coaches can update their own milestone categories" ON milestone_categories
    FOR UPDATE USING (coach_id = auth.uid());

CREATE POLICY "Coaches can delete their own milestone categories" ON milestone_categories
    FOR DELETE USING (coach_id = auth.uid());

-- Milestones Policies
-- Coaches can manage milestones for their clients
-- Clients can view their own milestones
CREATE POLICY "Coaches can view milestones for their clients" ON milestones
    FOR SELECT USING (
        coach_id = auth.uid() OR 
        (client_id = auth.uid() AND EXISTS (
            SELECT 1 FROM coach_client_relationships 
            WHERE coach_id = milestones.coach_id 
            AND client_id = auth.uid() 
            AND status = 'active'
        ))
    );

CREATE POLICY "Coaches can create milestones for their clients" ON milestones
    FOR INSERT WITH CHECK (
        coach_id = auth.uid() AND 
        EXISTS (
            SELECT 1 FROM coach_client_relationships 
            WHERE coach_id = auth.uid() 
            AND client_id = milestones.client_id 
            AND status = 'active'
        )
    );

CREATE POLICY "Coaches can update milestones for their clients" ON milestones
    FOR UPDATE USING (
        coach_id = auth.uid() AND 
        EXISTS (
            SELECT 1 FROM coach_client_relationships 
            WHERE coach_id = auth.uid() 
            AND client_id = milestones.client_id 
            AND status = 'active'
        )
    );

CREATE POLICY "Coaches can delete milestones for their clients" ON milestones
    FOR DELETE USING (
        coach_id = auth.uid() AND 
        EXISTS (
            SELECT 1 FROM coach_client_relationships 
            WHERE coach_id = auth.uid() 
            AND client_id = milestones.client_id 
            AND status = 'active'
        )
    );

-- Milestone Progress Policies
-- Coaches and clients can view progress for accessible milestones
CREATE POLICY "Users can view milestone progress for accessible milestones" ON milestone_progress
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM milestones 
            WHERE milestones.id = milestone_progress.milestone_id 
            AND (
                milestones.coach_id = auth.uid() OR 
                (milestones.client_id = auth.uid() AND EXISTS (
                    SELECT 1 FROM coach_client_relationships 
                    WHERE coach_id = milestones.coach_id 
                    AND client_id = auth.uid() 
                    AND status = 'active'
                ))
            )
        )
    );

-- Only coaches can record progress
CREATE POLICY "Coaches can create milestone progress" ON milestone_progress
    FOR INSERT WITH CHECK (
        recorded_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM milestones 
            WHERE milestones.id = milestone_progress.milestone_id 
            AND milestones.coach_id = auth.uid()
            AND EXISTS (
                SELECT 1 FROM coach_client_relationships 
                WHERE coach_id = auth.uid() 
                AND client_id = milestones.client_id 
                AND status = 'active'
            )
        )
    );

CREATE POLICY "Coaches can update milestone progress" ON milestone_progress
    FOR UPDATE USING (
        recorded_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM milestones 
            WHERE milestones.id = milestone_progress.milestone_id 
            AND milestones.coach_id = auth.uid()
        )
    );

CREATE POLICY "Coaches can delete milestone progress" ON milestone_progress
    FOR DELETE USING (
        recorded_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM milestones 
            WHERE milestones.id = milestone_progress.milestone_id 
            AND milestones.coach_id = auth.uid()
        )
    );

-- Insert default milestone categories
INSERT INTO milestone_categories (name, description, color, icon, coach_id, is_default) 
SELECT 
    'Personal Growth',
    'Self-improvement and personal development goals',
    '#10B981',
    'User',
    id,
    true
FROM profiles WHERE role = 'coach';

INSERT INTO milestone_categories (name, description, color, icon, coach_id, is_default) 
SELECT 
    'Career Development',
    'Professional growth and career advancement',
    '#3B82F6',
    'Briefcase',
    id,
    true
FROM profiles WHERE role = 'coach';

INSERT INTO milestone_categories (name, description, color, icon, coach_id, is_default) 
SELECT 
    'Health & Wellness',
    'Physical and mental health objectives',
    '#F59E0B',
    'Heart',
    id,
    true
FROM profiles WHERE role = 'coach';

INSERT INTO milestone_categories (name, description, color, icon, coach_id, is_default) 
SELECT 
    'Relationships',
    'Interpersonal and social connection goals',
    '#EF4444',
    'Users',
    id,
    true
FROM profiles WHERE role = 'coach';

INSERT INTO milestone_categories (name, description, color, icon, coach_id, is_default) 
SELECT 
    'Skills & Learning',
    'Knowledge acquisition and skill development',
    '#8B5CF6',
    'BookOpen',
    id,
    true
FROM profiles WHERE role = 'coach';

INSERT INTO milestone_categories (name, description, color, icon, coach_id, is_default) 
SELECT 
    'Financial',
    'Financial planning and money management',
    '#059669',
    'DollarSign',
    id,
    true
FROM profiles WHERE role = 'coach'; 