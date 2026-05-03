-- Helper to generate short random IDs (6 chars from base36 alphabet)
CREATE OR REPLACE FUNCTION public.generate_gear_id()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path TO 'public'
AS $$
DECLARE
  alphabet text := 'abcdefghijkmnpqrstuvwxyz23456789'; -- removed l, o, 0, 1 for legibility
  result text;
  i int;
  exists_check boolean;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..6 LOOP
      result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    SELECT EXISTS(SELECT 1 FROM public.gear WHERE id = result) INTO exists_check;
    EXIT WHEN NOT exists_check;
  END LOOP;
  RETURN result;
END;
$$;

-- Drop FKs that reference gear.id
ALTER TABLE public.gear_history DROP CONSTRAINT IF EXISTS gear_history_gear_id_fkey;
ALTER TABLE public.gear_request_items DROP CONSTRAINT IF EXISTS gear_request_items_gear_id_fkey;

-- Convert gear.id and referencing columns to text (existing values preserved as their decimal string)
ALTER TABLE public.gear ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE public.gear_history ALTER COLUMN gear_id TYPE text USING gear_id::text;
ALTER TABLE public.gear_request_items ALTER COLUMN gear_id TYPE text USING gear_id::text;

-- Set default for new gear rows
ALTER TABLE public.gear ALTER COLUMN id SET DEFAULT public.generate_gear_id();

-- Recreate FKs
ALTER TABLE public.gear_history
  ADD CONSTRAINT gear_history_gear_id_fkey
  FOREIGN KEY (gear_id) REFERENCES public.gear(id) ON DELETE CASCADE;

ALTER TABLE public.gear_request_items
  ADD CONSTRAINT gear_request_items_gear_id_fkey
  FOREIGN KEY (gear_id) REFERENCES public.gear(id) ON DELETE CASCADE;