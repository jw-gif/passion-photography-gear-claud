-- Enum for photographer tiers
CREATE TYPE public.photographer_tier AS ENUM ('point', 'door_holder', 'training_door_holder');

-- Photographers table
CREATE TABLE public.photographers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text,
  tier public.photographer_tier NOT NULL DEFAULT 'door_holder',
  token text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.photographers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read photographers"
  ON public.photographers FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins insert photographers"
  ON public.photographers FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins update photographers"
  ON public.photographers FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins delete photographers"
  ON public.photographers FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER touch_photographers_updated_at
  BEFORE UPDATE ON public.photographers
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_admin_profiles_updated_at();

-- Photo request openings
CREATE TABLE public.photo_request_openings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.photo_requests(id) ON DELETE CASCADE,
  role public.photographer_tier NOT NULL,
  budget_cents integer,
  position smallint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT budget_only_for_point CHECK (
    (role = 'point') OR (budget_cents IS NULL)
  ),
  CONSTRAINT budget_non_negative CHECK (
    budget_cents IS NULL OR budget_cents >= 0
  ),
  UNIQUE (request_id, role, position)
);

CREATE INDEX idx_openings_request ON public.photo_request_openings(request_id);

ALTER TABLE public.photo_request_openings ENABLE ROW LEVEL SECURITY;

-- Openings are readable by anyone (admin UI, future public roster preview).
-- Budget never leaks here since photographers don't directly query this table —
-- they go through list_open_jobs/get_job which strip the budget.
CREATE POLICY "admins read openings"
  ON public.photo_request_openings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins insert openings"
  ON public.photo_request_openings FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins update openings"
  ON public.photo_request_openings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins delete openings"
  ON public.photo_request_openings FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Photo request assignments
CREATE TABLE public.photo_request_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.photo_requests(id) ON DELETE CASCADE,
  opening_id uuid NOT NULL REFERENCES public.photo_request_openings(id) ON DELETE CASCADE,
  photographer_id uuid NOT NULL REFERENCES public.photographers(id) ON DELETE RESTRICT,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  released_at timestamptz,
  released_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uniq_active_assignment_per_opening
  ON public.photo_request_assignments(opening_id)
  WHERE released_at IS NULL;

CREATE INDEX idx_assignments_photographer ON public.photo_request_assignments(photographer_id);
CREATE INDEX idx_assignments_request ON public.photo_request_assignments(request_id);

ALTER TABLE public.photo_request_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read assignments"
  ON public.photo_request_assignments FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins insert assignments"
  ON public.photo_request_assignments FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins update assignments"
  ON public.photo_request_assignments FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins delete assignments"
  ON public.photo_request_assignments FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Helper: tier rank (higher = more privileged)
CREATE OR REPLACE FUNCTION public.tier_rank(t public.photographer_tier)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE t
    WHEN 'point' THEN 3
    WHEN 'door_holder' THEN 2
    WHEN 'training_door_holder' THEN 1
  END
$$;

-- Get photographer by token (used internally)
CREATE OR REPLACE FUNCTION public.get_photographer_by_token(_token text)
RETURNS TABLE (
  id uuid,
  name text,
  email text,
  tier public.photographer_tier,
  active boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, email, tier, active
  FROM public.photographers
  WHERE token = _token AND active = true
  LIMIT 1
$$;

-- List open jobs eligible for the photographer
CREATE OR REPLACE FUNCTION public.list_open_jobs(_token text)
RETURNS TABLE (
  opening_id uuid,
  request_id uuid,
  role public.photographer_tier,
  budget_cents integer,
  event_name text,
  event_location text,
  event_date date,
  event_end_date date,
  spans_multiple_days boolean,
  start_time time,
  end_time time,
  coverage_types public.photo_coverage_type[],
  on_site_contact_name text,
  on_site_contact_phone text,
  notes text,
  point_taken boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (
    SELECT id, tier FROM public.photographers
    WHERE token = _token AND active = true
    LIMIT 1
  )
  SELECT
    o.id AS opening_id,
    pr.id AS request_id,
    o.role,
    CASE
      WHEN o.role = 'point' AND (SELECT tier FROM me) = 'point'
        THEN o.budget_cents
      ELSE NULL
    END AS budget_cents,
    pr.event_name,
    pr.event_location,
    pr.event_date,
    pr.event_end_date,
    pr.spans_multiple_days,
    pr.start_time,
    pr.end_time,
    pr.coverage_types,
    pr.on_site_contact_name,
    pr.on_site_contact_phone,
    pr.notes,
    EXISTS (
      SELECT 1
      FROM public.photo_request_openings o2
      JOIN public.photo_request_assignments a2
        ON a2.opening_id = o2.id AND a2.released_at IS NULL
      WHERE o2.request_id = pr.id AND o2.role = 'point'
    ) AS point_taken
  FROM public.photo_request_openings o
  JOIN public.photo_requests pr ON pr.id = o.request_id
  WHERE
    EXISTS (SELECT 1 FROM me)
    AND pr.status IN ('scheduled', 'in_review')
    AND pr.event_date >= CURRENT_DATE
    AND public.tier_rank((SELECT tier FROM me)) >= public.tier_rank(o.role)
    AND NOT EXISTS (
      SELECT 1 FROM public.photo_request_assignments a
      WHERE a.opening_id = o.id AND a.released_at IS NULL
    )
  ORDER BY pr.event_date ASC, pr.start_time ASC NULLS LAST
$$;

-- Get a single job (with same field-level redaction)
CREATE OR REPLACE FUNCTION public.get_job(_token text, _opening_id uuid)
RETURNS TABLE (
  opening_id uuid,
  request_id uuid,
  role public.photographer_tier,
  budget_cents integer,
  event_name text,
  event_location text,
  event_date date,
  event_end_date date,
  spans_multiple_days boolean,
  start_time time,
  end_time time,
  coverage_types public.photo_coverage_type[],
  on_site_contact_name text,
  on_site_contact_phone text,
  notes text,
  is_claimed boolean,
  claimed_by_me boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (
    SELECT id, tier FROM public.photographers
    WHERE token = _token AND active = true
    LIMIT 1
  )
  SELECT
    o.id AS opening_id,
    pr.id AS request_id,
    o.role,
    CASE
      WHEN o.role = 'point' AND (SELECT tier FROM me) = 'point'
        THEN o.budget_cents
      ELSE NULL
    END AS budget_cents,
    pr.event_name,
    pr.event_location,
    pr.event_date,
    pr.event_end_date,
    pr.spans_multiple_days,
    pr.start_time,
    pr.end_time,
    pr.coverage_types,
    pr.on_site_contact_name,
    pr.on_site_contact_phone,
    pr.notes,
    EXISTS (
      SELECT 1 FROM public.photo_request_assignments a
      WHERE a.opening_id = o.id AND a.released_at IS NULL
    ) AS is_claimed,
    EXISTS (
      SELECT 1 FROM public.photo_request_assignments a
      WHERE a.opening_id = o.id
        AND a.released_at IS NULL
        AND a.photographer_id = (SELECT id FROM me)
    ) AS claimed_by_me
  FROM public.photo_request_openings o
  JOIN public.photo_requests pr ON pr.id = o.request_id
  WHERE o.id = _opening_id
    AND EXISTS (SELECT 1 FROM me)
    AND public.tier_rank((SELECT tier FROM me)) >= public.tier_rank(o.role)
$$;

-- List my claimed shoots
CREATE OR REPLACE FUNCTION public.list_my_jobs(_token text)
RETURNS TABLE (
  assignment_id uuid,
  opening_id uuid,
  request_id uuid,
  role public.photographer_tier,
  budget_cents integer,
  claimed_at timestamptz,
  event_name text,
  event_location text,
  event_date date,
  event_end_date date,
  spans_multiple_days boolean,
  start_time time,
  end_time time,
  coverage_types public.photo_coverage_type[],
  on_site_contact_name text,
  on_site_contact_phone text,
  notes text,
  request_status public.photo_request_status
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (
    SELECT id, tier FROM public.photographers
    WHERE token = _token AND active = true
    LIMIT 1
  )
  SELECT
    a.id AS assignment_id,
    o.id AS opening_id,
    pr.id AS request_id,
    o.role,
    CASE
      WHEN o.role = 'point' AND (SELECT tier FROM me) = 'point'
        THEN o.budget_cents
      ELSE NULL
    END AS budget_cents,
    a.claimed_at,
    pr.event_name,
    pr.event_location,
    pr.event_date,
    pr.event_end_date,
    pr.spans_multiple_days,
    pr.start_time,
    pr.end_time,
    pr.coverage_types,
    pr.on_site_contact_name,
    pr.on_site_contact_phone,
    pr.notes,
    pr.status
  FROM public.photo_request_assignments a
  JOIN public.photo_request_openings o ON o.id = a.opening_id
  JOIN public.photo_requests pr ON pr.id = o.request_id
  WHERE a.released_at IS NULL
    AND a.photographer_id = (SELECT id FROM me)
  ORDER BY pr.event_date ASC, pr.start_time ASC NULLS LAST
$$;

-- Claim a job
CREATE OR REPLACE FUNCTION public.claim_job(_token text, _opening_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_photographer_id uuid;
  v_photographer_tier public.photographer_tier;
  v_opening_role public.photographer_tier;
  v_request_id uuid;
  v_request_status public.photo_request_status;
  v_assignment_id uuid;
BEGIN
  SELECT id, tier INTO v_photographer_id, v_photographer_tier
  FROM public.photographers
  WHERE token = _token AND active = true
  LIMIT 1;

  IF v_photographer_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_token');
  END IF;

  SELECT o.role, o.request_id, pr.status
  INTO v_opening_role, v_request_id, v_request_status
  FROM public.photo_request_openings o
  JOIN public.photo_requests pr ON pr.id = o.request_id
  WHERE o.id = _opening_id;

  IF v_opening_role IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'opening_not_found');
  END IF;

  IF v_request_status NOT IN ('scheduled', 'in_review') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'request_not_open');
  END IF;

  IF public.tier_rank(v_photographer_tier) < public.tier_rank(v_opening_role) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'tier_too_low');
  END IF;

  BEGIN
    INSERT INTO public.photo_request_assignments
      (request_id, opening_id, photographer_id)
    VALUES (v_request_id, _opening_id, v_photographer_id)
    RETURNING id INTO v_assignment_id;
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_claimed');
  END;

  RETURN jsonb_build_object('ok', true, 'assignment_id', v_assignment_id);
END;
$$;

-- Release a job (within 48h)
CREATE OR REPLACE FUNCTION public.release_job(_token text, _opening_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_photographer_id uuid;
  v_photographer_name text;
  v_assignment record;
BEGIN
  SELECT id, name INTO v_photographer_id, v_photographer_name
  FROM public.photographers
  WHERE token = _token AND active = true
  LIMIT 1;

  IF v_photographer_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_token');
  END IF;

  SELECT * INTO v_assignment
  FROM public.photo_request_assignments
  WHERE opening_id = _opening_id
    AND released_at IS NULL
    AND photographer_id = v_photographer_id
  LIMIT 1;

  IF v_assignment.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_active_claim');
  END IF;

  IF v_assignment.claimed_at < (now() - interval '48 hours') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'release_window_expired');
  END IF;

  UPDATE public.photo_request_assignments
  SET released_at = now(),
      released_by = v_photographer_name
  WHERE id = v_assignment.id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Allow public/anon to call the photographer-facing functions
GRANT EXECUTE ON FUNCTION public.get_photographer_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_open_jobs(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_job(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_my_jobs(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_job(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_job(text, uuid) TO anon, authenticated;