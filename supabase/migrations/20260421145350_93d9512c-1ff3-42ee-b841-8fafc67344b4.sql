-- Add CHECK constraints to gear table
ALTER TABLE public.gear
  ADD CONSTRAINT gear_current_location_check
    CHECK (current_location IN ('515', 'Cumberland', 'Trilith')),
  ADD CONSTRAINT gear_last_note_length_check
    CHECK (last_note IS NULL OR length(last_note) <= 200),
  ADD CONSTRAINT gear_moved_by_length_check
    CHECK (moved_by IS NULL OR length(moved_by) <= 50),
  ADD CONSTRAINT gear_name_length_check
    CHECK (length(name) <= 100);

-- Add CHECK constraints to gear_history table
ALTER TABLE public.gear_history
  ADD CONSTRAINT gear_history_location_check
    CHECK (location IN ('515', 'Cumberland', 'Trilith')),
  ADD CONSTRAINT gear_history_note_length_check
    CHECK (note IS NULL OR length(note) <= 200),
  ADD CONSTRAINT gear_history_moved_by_length_check
    CHECK (moved_by IS NULL OR length(moved_by) <= 50);

-- Trigger to force server-side last_updated on gear UPDATE
CREATE OR REPLACE FUNCTION public.set_gear_last_updated()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.last_updated = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS gear_set_last_updated ON public.gear;
CREATE TRIGGER gear_set_last_updated
BEFORE UPDATE ON public.gear
FOR EACH ROW
EXECUTE FUNCTION public.set_gear_last_updated();