-- 1. Enum + user_roles table
CREATE TYPE public.app_role AS ENUM ('admin');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 2. has_role() security definer function (avoids recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 3. admin_profiles table
CREATE TABLE public.admin_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.touch_admin_profiles_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER admin_profiles_set_updated_at
BEFORE UPDATE ON public.admin_profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_admin_profiles_updated_at();

-- 4. user_roles RLS (admins only)
CREATE POLICY "admins read user_roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins insert user_roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins delete user_roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 5. admin_profiles RLS (public read so names show in history)
CREATE POLICY "anyone reads admin_profiles"
  ON public.admin_profiles FOR SELECT
  USING (true);

CREATE POLICY "admins or self insert admin_profiles"
  ON public.admin_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins or self update admin_profiles"
  ON public.admin_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins delete admin_profiles"
  ON public.admin_profiles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 6. Replace existing wide-open RLS on gear / gear_history / gear_requests / gear_request_items
DROP POLICY IF EXISTS "anyone can delete gear" ON public.gear;
DROP POLICY IF EXISTS "anyone can insert gear" ON public.gear;
DROP POLICY IF EXISTS "anyone can read gear" ON public.gear;
DROP POLICY IF EXISTS "anyone can update gear" ON public.gear;

CREATE POLICY "anyone reads gear"
  ON public.gear FOR SELECT USING (true);

CREATE POLICY "anyone updates gear"
  ON public.gear FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "admins insert gear"
  ON public.gear FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins delete gear"
  ON public.gear FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "anyone can insert history" ON public.gear_history;
DROP POLICY IF EXISTS "anyone can read history" ON public.gear_history;

CREATE POLICY "anyone reads gear_history"
  ON public.gear_history FOR SELECT USING (true);

CREATE POLICY "anyone inserts gear_history"
  ON public.gear_history FOR INSERT WITH CHECK (true);

CREATE POLICY "admins delete gear_history"
  ON public.gear_history FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "anyone can delete gear_requests" ON public.gear_requests;
DROP POLICY IF EXISTS "anyone can insert gear_requests" ON public.gear_requests;
DROP POLICY IF EXISTS "anyone can read gear_requests" ON public.gear_requests;
DROP POLICY IF EXISTS "anyone can update gear_requests" ON public.gear_requests;

CREATE POLICY "anyone reads gear_requests"
  ON public.gear_requests FOR SELECT USING (true);

CREATE POLICY "anyone inserts gear_requests"
  ON public.gear_requests FOR INSERT WITH CHECK (true);

CREATE POLICY "admins update gear_requests"
  ON public.gear_requests FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins delete gear_requests"
  ON public.gear_requests FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "anyone can delete gear_request_items" ON public.gear_request_items;
DROP POLICY IF EXISTS "anyone can insert gear_request_items" ON public.gear_request_items;
DROP POLICY IF EXISTS "anyone can read gear_request_items" ON public.gear_request_items;
DROP POLICY IF EXISTS "anyone can update gear_request_items" ON public.gear_request_items;

CREATE POLICY "anyone reads gear_request_items"
  ON public.gear_request_items FOR SELECT USING (true);

CREATE POLICY "anyone inserts gear_request_items"
  ON public.gear_request_items FOR INSERT WITH CHECK (true);

CREATE POLICY "admins update gear_request_items"
  ON public.gear_request_items FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins delete gear_request_items"
  ON public.gear_request_items FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 7. Validation trigger: limit what unauthenticated visitors can change on gear
CREATE OR REPLACE FUNCTION public.validate_public_gear_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Authenticated admins bypass all checks
  IF auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  -- Unauthenticated (or non-admin) updates: only certain columns may change
  IF NEW.name IS DISTINCT FROM OLD.name
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.requestable IS DISTINCT FROM OLD.requestable
     OR NEW.icon_kind IS DISTINCT FROM OLD.icon_kind
     OR NEW.id IS DISTINCT FROM OLD.id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Only admins can change protected gear fields';
  END IF;

  -- Validate current_location
  IF NEW.current_location NOT IN ('515', 'Cumberland', 'Trilith') THEN
    RAISE EXCEPTION 'Invalid current_location: %', NEW.current_location;
  END IF;

  -- Length caps
  IF NEW.sub_location IS NOT NULL AND length(NEW.sub_location) > 100 THEN
    RAISE EXCEPTION 'sub_location too long (max 100)';
  END IF;
  IF NEW.last_note IS NOT NULL AND length(NEW.last_note) > 200 THEN
    RAISE EXCEPTION 'last_note too long (max 200)';
  END IF;
  IF NEW.moved_by IS NOT NULL AND length(NEW.moved_by) > 50 THEN
    RAISE EXCEPTION 'moved_by too long (max 50)';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER gear_validate_public_update
BEFORE UPDATE ON public.gear
FOR EACH ROW EXECUTE FUNCTION public.validate_public_gear_update();