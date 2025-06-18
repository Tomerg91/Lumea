-- Migration for Resource Center
-- Creates tables for resources and resource assignments

-- Create resources table
CREATE TABLE resources (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title varchar(500) NOT NULL,
    description text,
    type varchar(20) CHECK (type IN ('file', 'link', 'video', 'document', 'pdf')) NOT NULL,
    file_url text, -- Supabase Storage URL for uploaded files
    link_url text, -- External URL for links
    file_name varchar(255), -- Original filename for uploaded files
    file_size bigint, -- File size in bytes
    mime_type varchar(100), -- MIME type for uploaded files
    coach_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    is_public boolean DEFAULT false, -- Whether resource is publicly accessible
    tags text[] DEFAULT '{}',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    
    -- Ensure either file_url or link_url is provided based on type
    CONSTRAINT resources_url_check CHECK (
        (type = 'link' AND link_url IS NOT NULL AND file_url IS NULL) OR
        (type IN ('file', 'video', 'document', 'pdf') AND file_url IS NOT NULL)
    )
);

-- Create resource_assignments table
CREATE TABLE resource_assignments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    resource_id uuid NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    client_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    coach_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    assigned_at timestamp with time zone DEFAULT now(),
    viewed_at timestamp with time zone,
    view_count integer DEFAULT 0,
    notes text, -- Coach notes about this assignment
    is_required boolean DEFAULT false, -- Whether this resource is required for the client
    due_date timestamp with time zone, -- Optional due date for reviewing the resource
    completed_at timestamp with time zone, -- When client marked as completed
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    
    -- Ensure unique assignment per resource-client pair
    CONSTRAINT resource_assignments_unique UNIQUE(resource_id, client_id),
    
    -- Ensure coach-client relationship exists
    CONSTRAINT resource_assignments_coach_client_check CHECK (
        EXISTS (
            SELECT 1 FROM coach_client_relationships 
            WHERE coach_id = resource_assignments.coach_id 
            AND client_id = resource_assignments.client_id 
            AND status = 'active'
        )
    )
);

-- Create indexes for better performance
CREATE INDEX idx_resources_coach_id ON resources(coach_id);
CREATE INDEX idx_resources_type ON resources(type);
CREATE INDEX idx_resources_created_at ON resources(created_at);
CREATE INDEX idx_resources_tags ON resources USING GIN(tags);

CREATE INDEX idx_resource_assignments_resource_id ON resource_assignments(resource_id);
CREATE INDEX idx_resource_assignments_client_id ON resource_assignments(client_id);
CREATE INDEX idx_resource_assignments_coach_id ON resource_assignments(coach_id);
CREATE INDEX idx_resource_assignments_assigned_at ON resource_assignments(assigned_at);
CREATE INDEX idx_resource_assignments_viewed_at ON resource_assignments(viewed_at);

-- Create updated_at triggers
CREATE TRIGGER update_resources_updated_at 
    BEFORE UPDATE ON resources 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resource_assignments_updated_at 
    BEFORE UPDATE ON resource_assignments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_assignments ENABLE ROW LEVEL SECURITY;

-- Resources Policies
-- Coaches can manage their own resources
CREATE POLICY "Coaches can view their own resources" ON resources
    FOR SELECT USING (coach_id = auth.uid());

CREATE POLICY "Coaches can create their own resources" ON resources
    FOR INSERT WITH CHECK (coach_id = auth.uid());

CREATE POLICY "Coaches can update their own resources" ON resources
    FOR UPDATE USING (coach_id = auth.uid());

CREATE POLICY "Coaches can delete their own resources" ON resources
    FOR DELETE USING (coach_id = auth.uid());

-- Clients can view resources assigned to them
CREATE POLICY "Clients can view assigned resources" ON resources
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM resource_assignments 
            WHERE resource_assignments.resource_id = resources.id 
            AND resource_assignments.client_id = auth.uid()
            AND EXISTS (
                SELECT 1 FROM coach_client_relationships 
                WHERE coach_id = resource_assignments.coach_id 
                AND client_id = auth.uid() 
                AND status = 'active'
            )
        )
    );

-- Resource Assignments Policies
-- Coaches can manage assignments for their resources and clients
CREATE POLICY "Coaches can view their resource assignments" ON resource_assignments
    FOR SELECT USING (
        coach_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM coach_client_relationships 
            WHERE coach_id = auth.uid() 
            AND client_id = resource_assignments.client_id 
            AND status = 'active'
        )
    );

CREATE POLICY "Coaches can create resource assignments" ON resource_assignments
    FOR INSERT WITH CHECK (
        coach_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM resources 
            WHERE resources.id = resource_assignments.resource_id 
            AND resources.coach_id = auth.uid()
        ) AND
        EXISTS (
            SELECT 1 FROM coach_client_relationships 
            WHERE coach_id = auth.uid() 
            AND client_id = resource_assignments.client_id 
            AND status = 'active'
        )
    );

CREATE POLICY "Coaches can update their resource assignments" ON resource_assignments
    FOR UPDATE USING (
        coach_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM coach_client_relationships 
            WHERE coach_id = auth.uid() 
            AND client_id = resource_assignments.client_id 
            AND status = 'active'
        )
    );

CREATE POLICY "Coaches can delete their resource assignments" ON resource_assignments
    FOR DELETE USING (
        coach_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM coach_client_relationships 
            WHERE coach_id = auth.uid() 
            AND client_id = resource_assignments.client_id 
            AND status = 'active'
        )
    );

-- Clients can view their own resource assignments
CREATE POLICY "Clients can view their assigned resources" ON resource_assignments
    FOR SELECT USING (
        client_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM coach_client_relationships 
            WHERE coach_id = resource_assignments.coach_id 
            AND client_id = auth.uid() 
            AND status = 'active'
        )
    );

-- Clients can update their own assignments (mark as viewed/completed)
CREATE POLICY "Clients can update their resource assignments" ON resource_assignments
    FOR UPDATE USING (
        client_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM coach_client_relationships 
            WHERE coach_id = resource_assignments.coach_id 
            AND client_id = auth.uid() 
            AND status = 'active'
        )
    ) WITH CHECK (
        -- Only allow clients to update their view/completion status
        client_id = auth.uid() AND
        view_count IS NOT NULL AND
        (viewed_at IS NOT NULL OR OLD.viewed_at IS NOT NULL) AND
        resource_id = OLD.resource_id AND
        coach_id = OLD.coach_id
    );

-- Create storage bucket for resource files if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('resources', 'resources', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for resources bucket
CREATE POLICY "Coaches can upload resource files" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'resources' AND
        auth.role() = 'authenticated' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Coaches can view their resource files" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'resources' AND
        auth.role() = 'authenticated' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Coaches can update their resource files" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'resources' AND
        auth.role() = 'authenticated' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Coaches can delete their resource files" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'resources' AND
        auth.role() = 'authenticated' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Clients can view resource files assigned to them
CREATE POLICY "Clients can view assigned resource files" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'resources' AND
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM resource_assignments ra
            JOIN resources r ON r.id = ra.resource_id
            WHERE ra.client_id = auth.uid()
            AND r.file_url LIKE '%' || name || '%'
            AND EXISTS (
                SELECT 1 FROM coach_client_relationships 
                WHERE coach_id = ra.coach_id 
                AND client_id = auth.uid() 
                AND status = 'active'
            )
        )
    ); 