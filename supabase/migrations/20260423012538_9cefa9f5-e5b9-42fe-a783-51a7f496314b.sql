-- Update claim_job to prevent multiple claims on the same request
CREATE OR REPLACE FUNCTION public.claim_job(_token text, _opening_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_photographer_id uuid;
  v_photographer_tier public.photographer_tier;
  v_opening_role public.photographer_tier;
  v_request_id uuid;
  v_request_status public.photo_request_status;
  v_assignment_id uuid;
  v_existing_on_shoot uuid;
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

  -- Prevent claiming a second opening on the same shoot
  SELECT a.id INTO v_existing_on_shoot
  FROM public.photo_request_assignments a
  JOIN public.photo_request_openings o2 ON o2.id = a.opening_id
  WHERE o2.request_id = v_request_id
    AND a.photographer_id = v_photographer_id
    AND a.released_at IS NULL
  LIMIT 1;

  IF v_existing_on_shoot IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_on_shoot');
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
$function$;

-- Update list_open_jobs to hide openings on shoots the photographer already has a claim on
CREATE OR REPLACE FUNCTION public.list_open_jobs(_token text)
 RETURNS TABLE(opening_id uuid, request_id uuid, role photographer_tier, budget_cents integer, event_name text, event_location text, event_date date, event_end_date date, spans_multiple_days boolean, start_time time without time zone, end_time time without time zone, coverage_types photo_coverage_type[], on_site_contact_name text, on_site_contact_phone text, notes text, point_taken boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    -- Exclude shoots where this photographer already has an active claim
    AND NOT EXISTS (
      SELECT 1
      FROM public.photo_request_assignments a3
      JOIN public.photo_request_openings o3 ON o3.id = a3.opening_id
      WHERE o3.request_id = pr.id
        AND a3.photographer_id = (SELECT id FROM me)
        AND a3.released_at IS NULL
    )
  ORDER BY pr.event_date ASC, pr.start_time ASC NULLS LAST
$function$;