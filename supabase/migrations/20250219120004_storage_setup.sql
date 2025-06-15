-- Lumea Coaching Platform - Storage Setup
-- Creates Supabase Storage buckets and policies
-- Date: 2025-02-19

-- =============================================================================
-- STORAGE BUCKETS
-- =============================================================================

-- Create storage buckets for different file types
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('profiles', 'profiles', true),
  ('resources', 'resources', false),
  ('audio-notes', 'audio-notes', false),
  ('documents', 'documents', false),
  ('session-files', 'session-files', false);

-- =============================================================================
-- STORAGE POLICIES
-- =============================================================================

-- Profile Pictures Bucket Policies (public)
CREATE POLICY "Anyone can view profile pictures"
ON storage.objects FOR SELECT
USING (bucket_id = 'profiles');

CREATE POLICY "Users can upload their own profile pictures"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profiles' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own profile pictures"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profiles' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own profile pictures"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profiles' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Resources Bucket Policies (private)
CREATE POLICY "Coaches can manage their resources"
ON storage.objects FOR ALL
USING (
  bucket_id = 'resources' AND 
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'coach'
  ) AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view shared resources"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'resources' AND 
  EXISTS (
    SELECT 1 FROM public.resource_users ru
    JOIN public.resources r ON r.id = ru.resource_id
    WHERE ru.user_id = auth.uid() 
    AND r.title = (storage.foldername(name))[2]
  )
);

-- Audio Notes Bucket Policies (private)
CREATE POLICY "Users can manage their own audio notes"
ON storage.objects FOR ALL
USING (
  bucket_id = 'audio-notes' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Coaches can access client audio notes"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'audio-notes' AND 
  EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.coach_id = auth.uid() 
    AND s.client_id::text = (storage.foldername(name))[1]
  )
);

-- Documents Bucket Policies (private)
CREATE POLICY "Users can manage their own documents"
ON storage.objects FOR ALL
USING (
  bucket_id = 'documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Coaches can access client documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents' AND 
  EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.coach_id = auth.uid() 
    AND s.client_id::text = (storage.foldername(name))[1]
  )
);

-- Session Files Bucket Policies (private)
CREATE POLICY "Users can access session files they're involved in"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'session-files' AND 
  EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE (s.coach_id = auth.uid() OR s.client_id = auth.uid())
    AND s.id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Coaches can upload session files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'session-files' AND 
  EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.coach_id = auth.uid() 
    AND s.id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Coaches can update session files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'session-files' AND 
  EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.coach_id = auth.uid() 
    AND s.id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Coaches can delete session files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'session-files' AND 
  EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.coach_id = auth.uid() 
    AND s.id::text = (storage.foldername(name))[1]
  )
);

-- =============================================================================
-- STORAGE HELPER FUNCTIONS
-- =============================================================================

-- Function to get file upload URL with proper path structure
CREATE OR REPLACE FUNCTION public.get_upload_url(
  bucket_name TEXT,
  file_name TEXT,
  file_type TEXT DEFAULT 'documents'
)
RETURNS TEXT AS $$
DECLARE
  file_path TEXT;
BEGIN
  -- Create structured file path based on user and type
  file_path := auth.uid()::text || '/' || file_type || '/' || file_name;
  
  -- Return the storage path for client-side upload
  RETURN file_path;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create file record after upload
CREATE OR REPLACE FUNCTION public.create_file_record(
  p_filename TEXT,
  p_original_name TEXT,
  p_mimetype TEXT,
  p_size INTEGER,
  p_storage_path TEXT,
  p_context TEXT DEFAULT 'document'
)
RETURNS UUID AS $$
DECLARE
  file_id UUID;
BEGIN
  INSERT INTO public.files (
    user_id,
    filename,
    original_name,
    mimetype,
    size,
    storage_path,
    context
  ) VALUES (
    auth.uid(),
    p_filename,
    p_original_name,
    p_mimetype,
    p_size,
    p_storage_path,
    p_context
  ) RETURNING id INTO file_id;
  
  RETURN file_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete file and record
CREATE OR REPLACE FUNCTION public.delete_file(file_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  file_record RECORD;
BEGIN
  -- Get file record (with RLS check)
  SELECT * INTO file_record
  FROM public.files
  WHERE id = file_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Delete from storage (this would be handled by client-side code)
  -- The actual deletion from storage.objects needs to be done via the client
  
  -- Delete database record
  DELETE FROM public.files WHERE id = file_id;
  
  -- Create audit log
  PERFORM public.create_audit_log(
    'DELETE',
    'file',
    file_id,
    row_to_json(file_record)::jsonb,
    NULL,
    'File deleted: ' || file_record.original_name
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 