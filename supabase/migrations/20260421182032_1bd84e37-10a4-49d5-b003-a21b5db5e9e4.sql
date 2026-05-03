-- 1. Status enum + column
CREATE TYPE public.gear_status AS ENUM ('active', 'out_of_service', 'out_for_repair');

ALTER TABLE public.gear
  ADD COLUMN status public.gear_status NOT NULL DEFAULT 'active';

-- 2. Allow inserts and deletes on gear (matches existing public-write pattern in this app)
CREATE POLICY "anyone can insert gear"
  ON public.gear
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "anyone can delete gear"
  ON public.gear
  FOR DELETE
  TO public
  USING (true);

-- 3. When gear is deleted, also delete its history (since gear_history.gear_id has no FK cascade)
CREATE OR REPLACE FUNCTION public.cascade_delete_gear_history()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.gear_history WHERE gear_id = OLD.id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_cascade_delete_gear_history
  BEFORE DELETE ON public.gear
  FOR EACH ROW
  EXECUTE FUNCTION public.cascade_delete_gear_history();