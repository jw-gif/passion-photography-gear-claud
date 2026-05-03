ALTER TABLE public.gear_history
  DROP CONSTRAINT gear_history_gear_id_fkey,
  ADD CONSTRAINT gear_history_gear_id_fkey
    FOREIGN KEY (gear_id) REFERENCES public.gear(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE public.gear_request_items
  DROP CONSTRAINT gear_request_items_gear_id_fkey,
  ADD CONSTRAINT gear_request_items_gear_id_fkey
    FOREIGN KEY (gear_id) REFERENCES public.gear(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;

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