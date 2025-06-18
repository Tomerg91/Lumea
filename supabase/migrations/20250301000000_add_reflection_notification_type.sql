-- Migration: Add reflection_submitted notification type
-- Date: 2025-03-01
-- Description: Add support for reflection submission notifications to coaches

-- Drop the existing constraint
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add the new constraint with reflection_submitted type
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
  'session_cancelled', 
  'session_rescheduled', 
  'session_reminder', 
  'session_confirmation', 
  'cancellation_request', 
  'reschedule_request', 
  'feedback_request',
  'reflection_submitted'
));

-- Add a comment to document the new notification type
COMMENT ON CONSTRAINT notifications_type_check ON public.notifications IS 
'Valid notification types including reflection_submitted for coach notifications when clients submit reflections'; 