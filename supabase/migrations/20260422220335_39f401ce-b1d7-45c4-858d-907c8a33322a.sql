-- Photo request status enum
CREATE TYPE public.photo_request_status AS ENUM (
  'new',
  'in_review',
  'scheduled',
  'completed',
  'declined',
  'archived'
);

-- Photo request type enum
CREATE TYPE public.photo_request_type AS ENUM (
  'photography_team',
  'shot_list_addition',
  'photoshoot'
);

-- Photo request coverage enum
CREATE TYPE public.photo_coverage_type AS ENUM (
  'live_event',
  'photo_booth',
  'other'
);

-- Main photo requests table
CREATE TABLE public.photo_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Requestor info
  company TEXT NOT NULL,
  team TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,

  -- What they're requesting
  request_types public.photo_request_type[] NOT NULL DEFAULT '{}',

  -- Event details (nullable for shot list additions)
  event_name TEXT,
  event_location TEXT,
  event_date DATE,
  spans_multiple_days BOOLEAN NOT NULL DEFAULT false,
  event_end_date DATE,
  start_time TIME,
  end_time TIME,
  on_site_contact_name TEXT,
  on_site_contact_phone TEXT,
  coverage_types public.photo_coverage_type[] NOT NULL DEFAULT '{}',
  coverage_other TEXT,

  -- Budget / Concur
  budget TEXT,
  concur_budget_approver TEXT,
  concur_company TEXT,
  concur_class TEXT,
  concur_department TEXT,
  concur_expense_category TEXT,
  concur_project TEXT,
  concur_people_resource_type TEXT,

  -- Free-form notes (e.g. for shot list additions / photoshoot details)
  notes TEXT,

  -- Admin workflow
  status public.photo_request_status NOT NULL DEFAULT 'new',
  admin_notes TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  assigned_to TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Sanity caps (defense in depth alongside zod)
  CONSTRAINT photo_requests_first_name_len CHECK (char_length(first_name) BETWEEN 1 AND 100),
  CONSTRAINT photo_requests_last_name_len CHECK (char_length(last_name) BETWEEN 1 AND 100),
  CONSTRAINT photo_requests_email_len CHECK (char_length(email) BETWEEN 3 AND 255),
  CONSTRAINT photo_requests_company_len CHECK (char_length(company) BETWEEN 1 AND 100),
  CONSTRAINT photo_requests_team_len CHECK (team IS NULL OR char_length(team) <= 100),
  CONSTRAINT photo_requests_event_name_len CHECK (event_name IS NULL OR char_length(event_name) <= 200),
  CONSTRAINT photo_requests_event_location_len CHECK (event_location IS NULL OR char_length(event_location) <= 200),
  CONSTRAINT photo_requests_contact_name_len CHECK (on_site_contact_name IS NULL OR char_length(on_site_contact_name) <= 100),
  CONSTRAINT photo_requests_contact_phone_len CHECK (on_site_contact_phone IS NULL OR char_length(on_site_contact_phone) <= 30),
  CONSTRAINT photo_requests_notes_len CHECK (notes IS NULL OR char_length(notes) <= 4000),
  CONSTRAINT photo_requests_admin_notes_len CHECK (admin_notes IS NULL OR char_length(admin_notes) <= 4000),
  CONSTRAINT photo_requests_coverage_other_len CHECK (coverage_other IS NULL OR char_length(coverage_other) <= 500)
);

-- Indexes
CREATE INDEX idx_photo_requests_status ON public.photo_requests(status);
CREATE INDEX idx_photo_requests_event_date ON public.photo_requests(event_date);
CREATE INDEX idx_photo_requests_created_at ON public.photo_requests(created_at DESC);

-- updated_at trigger reuses existing helper if present, else inline
CREATE OR REPLACE FUNCTION public.touch_photo_requests_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER photo_requests_set_updated_at
BEFORE UPDATE ON public.photo_requests
FOR EACH ROW
EXECUTE FUNCTION public.touch_photo_requests_updated_at();

-- RLS
ALTER TABLE public.photo_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a request (public form)
CREATE POLICY "anyone inserts photo_requests"
  ON public.photo_requests
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Only admins can read
CREATE POLICY "admins read photo_requests"
  ON public.photo_requests
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can update
CREATE POLICY "admins update photo_requests"
  ON public.photo_requests
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete
CREATE POLICY "admins delete photo_requests"
  ON public.photo_requests
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));