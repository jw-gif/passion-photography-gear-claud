
-- 1. Restrict gear_requests SELECT to admins/team
DROP POLICY IF EXISTS "anyone reads gear_requests" ON public.gear_requests;

CREATE POLICY "admins read gear_requests"
ON public.gear_requests
FOR SELECT
TO authenticated
USING (public.has_admin_access(auth.uid()));

-- Same for gear_request_items (it joins with gear_requests and contains request_id linkage)
DROP POLICY IF EXISTS "anyone reads gear_request_items" ON public.gear_request_items;

CREATE POLICY "admins read gear_request_items"
ON public.gear_request_items
FOR SELECT
TO authenticated
USING (public.has_admin_access(auth.uid()));

-- 2. Public-safe RPCs for the anonymous Request Gear form

-- Returns upcoming conflict dates per gear item (no PII)
CREATE OR REPLACE FUNCTION public.get_gear_conflicts(_from date, _to date)
RETURNS TABLE(gear_id text, needed_date date, status public.gear_request_status)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.gear_id, r.needed_date, r.status
  FROM public.gear_requests r
  JOIN public.gear_request_items i ON i.request_id = r.id
  WHERE r.needed_date BETWEEN _from AND _to
    AND r.status IN ('pending'::public.gear_request_status, 'approved'::public.gear_request_status)
$$;

-- Returns recent gear ids requested by a given (case-insensitive) requestor name (no PII besides what was passed in)
CREATE OR REPLACE FUNCTION public.get_recent_gear_for_requestor(_name text, _limit int DEFAULT 5)
RETURNS TABLE(gear_id text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ON (i.gear_id) i.gear_id
  FROM public.gear_requests r
  JOIN public.gear_request_items i ON i.request_id = r.id
  WHERE r.requestor_name ILIKE _name
  ORDER BY i.gear_id, r.created_at DESC
  LIMIT _limit
$$;

GRANT EXECUTE ON FUNCTION public.get_gear_conflicts(date, date) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_recent_gear_for_requestor(text, int) TO anon, authenticated;

-- 3. Harden email queue helpers: set immutable search_path
CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name text, payload jsonb)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pgmq
AS $function$
BEGIN
  RETURN pgmq.send(queue_name, payload);
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN pgmq.send(queue_name, payload);
END;
$function$;

CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name text, batch_size integer, vt integer)
RETURNS TABLE(msg_id bigint, read_ct integer, message jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pgmq
AS $function$
BEGIN
  RETURN QUERY SELECT r.msg_id, r.read_ct, r.message FROM pgmq.read(queue_name, vt, batch_size) r;
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN;
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_email(queue_name text, message_id bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pgmq
AS $function$
BEGIN
  RETURN pgmq.delete(queue_name, message_id);
EXCEPTION WHEN undefined_table THEN
  RETURN FALSE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.move_to_dlq(source_queue text, dlq_name text, message_id bigint, payload jsonb)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pgmq
AS $function$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
EXCEPTION WHEN undefined_table THEN
  BEGIN
    PERFORM pgmq.create(dlq_name);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  BEGIN
    PERFORM pgmq.delete(source_queue, message_id);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;
  RETURN new_id;
END;
$function$;

-- 4. Revoke public EXECUTE on internal SECURITY DEFINER functions
-- These are called only from server contexts (service role / triggers) and shouldn't be exposed via PostgREST
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, authenticated, public;
