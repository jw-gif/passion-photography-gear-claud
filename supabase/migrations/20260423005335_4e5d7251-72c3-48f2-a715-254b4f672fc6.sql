-- Create photo_request_shot_lists table
CREATE TABLE public.photo_request_shot_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL UNIQUE REFERENCES public.photo_requests(id) ON DELETE CASCADE,
  brief jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.photo_request_shot_lists ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can view all shot lists"
  ON public.photo_request_shot_lists
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert shot lists"
  ON public.photo_request_shot_lists
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update shot lists"
  ON public.photo_request_shot_lists
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete shot lists"
  ON public.photo_request_shot_lists
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_shot_list_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_shot_list_updated_at
  BEFORE UPDATE ON public.photo_request_shot_lists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_shot_list_updated_at();

-- get_shot_list: photographer-facing RPC, returns the brief filtered to segments their role can see
CREATE OR REPLACE FUNCTION public.get_shot_list(_token text, _opening_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _photographer_id uuid;
  _photographer_role public.photographer_tier;
  _request_id uuid;
  _brief jsonb;
  _filtered_segments jsonb;
BEGIN
  -- Find photographer by token
  SELECT id, tier INTO _photographer_id, _photographer_role
  FROM public.photographers
  WHERE token = _token AND active = true;

  IF _photographer_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Verify they have an active assignment for an opening on this request
  SELECT o.request_id INTO _request_id
  FROM public.photo_request_openings o
  JOIN public.photo_request_assignments a ON a.opening_id = o.id
  WHERE o.id = _opening_id
    AND a.photographer_id = _photographer_id
    AND a.released_at IS NULL
  LIMIT 1;

  IF _request_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Load the brief
  SELECT brief INTO _brief
  FROM public.photo_request_shot_lists
  WHERE request_id = _request_id;

  IF _brief IS NULL THEN
    RETURN NULL;
  END IF;

  -- Filter segments: only keep segments where assigned_roles contains 'all' or the photographer's role
  SELECT COALESCE(jsonb_agg(seg), '[]'::jsonb)
  INTO _filtered_segments
  FROM jsonb_array_elements(COALESCE(_brief->'segments', '[]'::jsonb)) seg
  WHERE seg->'assigned_roles' IS NULL
     OR seg->'assigned_roles' @> '["all"]'::jsonb
     OR seg->'assigned_roles' @> to_jsonb(ARRAY[_photographer_role::text]);

  RETURN jsonb_set(_brief, '{segments}', _filtered_segments);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_shot_list(text, uuid) TO anon, authenticated;