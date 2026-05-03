DO $$
DECLARE
  r record;
  new_id text;
BEGIN
  FOR r IN SELECT id FROM public.gear LOOP
    new_id := public.generate_gear_id();
    UPDATE public.gear SET id = new_id WHERE id = r.id;
    UPDATE public.gear_history SET gear_id = new_id WHERE gear_id = r.id;
    UPDATE public.gear_request_items SET gear_id = new_id WHERE gear_id = r.id;
  END LOOP;
END $$;