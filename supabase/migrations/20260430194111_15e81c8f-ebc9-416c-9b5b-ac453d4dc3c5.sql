-- Helper: admins or team
CREATE OR REPLACE FUNCTION public.has_admin_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin'::public.app_role, 'team'::public.app_role)
  )
$$;

-- admin_profiles: delete stays admin-only; insert/update broaden
DROP POLICY IF EXISTS "admins or self insert admin_profiles" ON public.admin_profiles;
CREATE POLICY "admins or self insert admin_profiles"
  ON public.admin_profiles FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = id) OR public.has_admin_access(auth.uid()));

DROP POLICY IF EXISTS "admins or self update admin_profiles" ON public.admin_profiles;
CREATE POLICY "admins or self update admin_profiles"
  ON public.admin_profiles FOR UPDATE TO authenticated
  USING ((auth.uid() = id) OR public.has_admin_access(auth.uid()))
  WITH CHECK ((auth.uid() = id) OR public.has_admin_access(auth.uid()));

-- user_roles: SELECT broadens to team; INSERT/DELETE stay admin-only
DROP POLICY IF EXISTS "admins read user_roles" ON public.user_roles;
CREATE POLICY "admin access read user_roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_admin_access(auth.uid()));

-- gear
DROP POLICY IF EXISTS "admins delete gear" ON public.gear;
CREATE POLICY "admins delete gear"
  ON public.gear FOR DELETE TO authenticated
  USING (public.has_admin_access(auth.uid()));

DROP POLICY IF EXISTS "admins insert gear" ON public.gear;
CREATE POLICY "admins insert gear"
  ON public.gear FOR INSERT TO authenticated
  WITH CHECK (public.has_admin_access(auth.uid()));

-- gear_history
DROP POLICY IF EXISTS "admins delete gear_history" ON public.gear_history;
CREATE POLICY "admins delete gear_history"
  ON public.gear_history FOR DELETE TO authenticated
  USING (public.has_admin_access(auth.uid()));

-- gear_requests
DROP POLICY IF EXISTS "admins delete gear_requests" ON public.gear_requests;
CREATE POLICY "admins delete gear_requests"
  ON public.gear_requests FOR DELETE TO authenticated
  USING (public.has_admin_access(auth.uid()));

DROP POLICY IF EXISTS "admins update gear_requests" ON public.gear_requests;
CREATE POLICY "admins update gear_requests"
  ON public.gear_requests FOR UPDATE TO authenticated
  USING (public.has_admin_access(auth.uid()))
  WITH CHECK (public.has_admin_access(auth.uid()));

-- gear_request_items
DROP POLICY IF EXISTS "admins delete gear_request_items" ON public.gear_request_items;
CREATE POLICY "admins delete gear_request_items"
  ON public.gear_request_items FOR DELETE TO authenticated
  USING (public.has_admin_access(auth.uid()));

DROP POLICY IF EXISTS "admins update gear_request_items" ON public.gear_request_items;
CREATE POLICY "admins update gear_request_items"
  ON public.gear_request_items FOR UPDATE TO authenticated
  USING (public.has_admin_access(auth.uid()))
  WITH CHECK (public.has_admin_access(auth.uid()));

-- photo_requests
DROP POLICY IF EXISTS "admins read photo_requests" ON public.photo_requests;
CREATE POLICY "admins read photo_requests"
  ON public.photo_requests FOR SELECT TO authenticated
  USING (public.has_admin_access(auth.uid()));

DROP POLICY IF EXISTS "admins update photo_requests" ON public.photo_requests;
CREATE POLICY "admins update photo_requests"
  ON public.photo_requests FOR UPDATE TO authenticated
  USING (public.has_admin_access(auth.uid()))
  WITH CHECK (public.has_admin_access(auth.uid()));

DROP POLICY IF EXISTS "admins delete photo_requests" ON public.photo_requests;
CREATE POLICY "admins delete photo_requests"
  ON public.photo_requests FOR DELETE TO authenticated
  USING (public.has_admin_access(auth.uid()));

-- photo_request_openings
DROP POLICY IF EXISTS "admins read openings" ON public.photo_request_openings;
CREATE POLICY "admins read openings"
  ON public.photo_request_openings FOR SELECT TO authenticated
  USING (public.has_admin_access(auth.uid()));

DROP POLICY IF EXISTS "admins insert openings" ON public.photo_request_openings;
CREATE POLICY "admins insert openings"
  ON public.photo_request_openings FOR INSERT TO authenticated
  WITH CHECK (public.has_admin_access(auth.uid()));

DROP POLICY IF EXISTS "admins update openings" ON public.photo_request_openings;
CREATE POLICY "admins update openings"
  ON public.photo_request_openings FOR UPDATE TO authenticated
  USING (public.has_admin_access(auth.uid()))
  WITH CHECK (public.has_admin_access(auth.uid()));

DROP POLICY IF EXISTS "admins delete openings" ON public.photo_request_openings;
CREATE POLICY "admins delete openings"
  ON public.photo_request_openings FOR DELETE TO authenticated
  USING (public.has_admin_access(auth.uid()));

-- photo_request_assignments
DROP POLICY IF EXISTS "admins read assignments" ON public.photo_request_assignments;
CREATE POLICY "admins read assignments"
  ON public.photo_request_assignments FOR SELECT TO authenticated
  USING (public.has_admin_access(auth.uid()));

DROP POLICY IF EXISTS "admins insert assignments" ON public.photo_request_assignments;
CREATE POLICY "admins insert assignments"
  ON public.photo_request_assignments FOR INSERT TO authenticated
  WITH CHECK (public.has_admin_access(auth.uid()));

DROP POLICY IF EXISTS "admins update assignments" ON public.photo_request_assignments;
CREATE POLICY "admins update assignments"
  ON public.photo_request_assignments FOR UPDATE TO authenticated
  USING (public.has_admin_access(auth.uid()))
  WITH CHECK (public.has_admin_access(auth.uid()));

DROP POLICY IF EXISTS "admins delete assignments" ON public.photo_request_assignments;
CREATE POLICY "admins delete assignments"
  ON public.photo_request_assignments FOR DELETE TO authenticated
  USING (public.has_admin_access(auth.uid()));

-- photo_request_shot_lists
DROP POLICY IF EXISTS "Admins can view all shot lists" ON public.photo_request_shot_lists;
CREATE POLICY "Admins can view all shot lists"
  ON public.photo_request_shot_lists FOR SELECT TO authenticated
  USING (public.has_admin_access(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert shot lists" ON public.photo_request_shot_lists;
CREATE POLICY "Admins can insert shot lists"
  ON public.photo_request_shot_lists FOR INSERT TO authenticated
  WITH CHECK (public.has_admin_access(auth.uid()));

DROP POLICY IF EXISTS "Admins can update shot lists" ON public.photo_request_shot_lists;
CREATE POLICY "Admins can update shot lists"
  ON public.photo_request_shot_lists FOR UPDATE TO authenticated
  USING (public.has_admin_access(auth.uid()))
  WITH CHECK (public.has_admin_access(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete shot lists" ON public.photo_request_shot_lists;
CREATE POLICY "Admins can delete shot lists"
  ON public.photo_request_shot_lists FOR DELETE TO authenticated
  USING (public.has_admin_access(auth.uid()));

-- photographers
DROP POLICY IF EXISTS "admins read photographers" ON public.photographers;
CREATE POLICY "admins read photographers"
  ON public.photographers FOR SELECT TO authenticated
  USING (public.has_admin_access(auth.uid()));

DROP POLICY IF EXISTS "admins insert photographers" ON public.photographers;
CREATE POLICY "admins insert photographers"
  ON public.photographers FOR INSERT TO authenticated
  WITH CHECK (public.has_admin_access(auth.uid()));

DROP POLICY IF EXISTS "admins update photographers" ON public.photographers;
CREATE POLICY "admins update photographers"
  ON public.photographers FOR UPDATE TO authenticated
  USING (public.has_admin_access(auth.uid()))
  WITH CHECK (public.has_admin_access(auth.uid()));

DROP POLICY IF EXISTS "admins delete photographers" ON public.photographers;
CREATE POLICY "admins delete photographers"
  ON public.photographers FOR DELETE TO authenticated
  USING (public.has_admin_access(auth.uid()));

-- shot_list_templates (note: also used by shot_list_segment_blocks/location_blocks naming collision — drop by exact name)
DROP POLICY IF EXISTS "admins delete templates" ON public.shot_list_templates;
CREATE POLICY "admins delete templates"
  ON public.shot_list_templates FOR DELETE TO authenticated
  USING (public.has_admin_access(auth.uid()));

DROP POLICY IF EXISTS "admins insert templates" ON public.shot_list_templates;
CREATE POLICY "admins insert templates"
  ON public.shot_list_templates FOR INSERT TO authenticated
  WITH CHECK (public.has_admin_access(auth.uid()));

DROP POLICY IF EXISTS "admins update templates" ON public.shot_list_templates;
CREATE POLICY "admins update templates"
  ON public.shot_list_templates FOR UPDATE TO authenticated
  USING (public.has_admin_access(auth.uid()))
  WITH CHECK (public.has_admin_access(auth.uid()));

-- shot_list_segment_blocks
DROP POLICY IF EXISTS "admins delete segment blocks" ON public.shot_list_segment_blocks;
CREATE POLICY "admins delete segment blocks"
  ON public.shot_list_segment_blocks FOR DELETE TO authenticated
  USING (public.has_admin_access(auth.uid()));

DROP POLICY IF EXISTS "admins insert segment blocks" ON public.shot_list_segment_blocks;
CREATE POLICY "admins insert segment blocks"
  ON public.shot_list_segment_blocks FOR INSERT TO authenticated
  WITH CHECK (public.has_admin_access(auth.uid()));

DROP POLICY IF EXISTS "admins update segment blocks" ON public.shot_list_segment_blocks;
CREATE POLICY "admins update segment blocks"
  ON public.shot_list_segment_blocks FOR UPDATE TO authenticated
  USING (public.has_admin_access(auth.uid()))
  WITH CHECK (public.has_admin_access(auth.uid()));

-- shot_list_location_blocks
DROP POLICY IF EXISTS "admins delete location blocks" ON public.shot_list_location_blocks;
CREATE POLICY "admins delete location blocks"
  ON public.shot_list_location_blocks FOR DELETE TO authenticated
  USING (public.has_admin_access(auth.uid()));

DROP POLICY IF EXISTS "admins insert location blocks" ON public.shot_list_location_blocks;
CREATE POLICY "admins insert location blocks"
  ON public.shot_list_location_blocks FOR INSERT TO authenticated
  WITH CHECK (public.has_admin_access(auth.uid()));

DROP POLICY IF EXISTS "admins update location blocks" ON public.shot_list_location_blocks;
CREATE POLICY "admins update location blocks"
  ON public.shot_list_location_blocks FOR UPDATE TO authenticated
  USING (public.has_admin_access(auth.uid()))
  WITH CHECK (public.has_admin_access(auth.uid()));

-- Update validate_public_gear_update so authenticated team users bypass like admins
CREATE OR REPLACE FUNCTION public.validate_public_gear_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL AND public.has_admin_access(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF NEW.name IS DISTINCT FROM OLD.name
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.requestable IS DISTINCT FROM OLD.requestable
     OR NEW.icon_kind IS DISTINCT FROM OLD.icon_kind
     OR NEW.id IS DISTINCT FROM OLD.id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Only admins can change protected gear fields';
  END IF;

  IF NEW.current_location NOT IN ('515', 'Cumberland', 'Trilith') THEN
    RAISE EXCEPTION 'Invalid current_location: %', NEW.current_location;
  END IF;

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
$function$;