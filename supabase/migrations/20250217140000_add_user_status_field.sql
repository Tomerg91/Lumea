-- Add status field to users table for coach approval workflow
-- Date: 2025-02-17

-- Add status column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' 
CHECK (status IN ('active', 'pending_approval', 'approved', 'rejected', 'suspended'));

-- Create index for performance on status queries
CREATE INDEX IF NOT EXISTS users_status_idx ON public.users(status);

-- Create index for coach approval queries (role + status)
CREATE INDEX IF NOT EXISTS users_role_status_idx ON public.users(role, status);

-- Set existing users to 'active' status (except coaches who should be 'approved')
UPDATE public.users 
SET status = CASE 
  WHEN role = 'coach' THEN 'approved'
  ELSE 'active'
END
WHERE status = 'active';

-- Update the RLS policies to include status considerations if needed
-- (This will be handled in the application logic for now) 