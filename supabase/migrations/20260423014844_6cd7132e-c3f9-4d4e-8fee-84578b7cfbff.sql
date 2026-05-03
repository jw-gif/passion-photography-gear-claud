-- Add new photo_request_status enum values for the updated approval workflow
ALTER TYPE public.photo_request_status ADD VALUE IF NOT EXISTS 'pending';
ALTER TYPE public.photo_request_status ADD VALUE IF NOT EXISTS 'approved_job_board';
ALTER TYPE public.photo_request_status ADD VALUE IF NOT EXISTS 'approved_shot_list';
ALTER TYPE public.photo_request_status ADD VALUE IF NOT EXISTS 'needs_revisions';
ALTER TYPE public.photo_request_status ADD VALUE IF NOT EXISTS 'denied';