-- Add sub_location column to gear and gear_history tables
ALTER TABLE public.gear ADD COLUMN sub_location text;
ALTER TABLE public.gear_history ADD COLUMN sub_location text;

-- Length constraint to prevent abuse via direct API calls
ALTER TABLE public.gear ADD CONSTRAINT gear_sub_location_length CHECK (sub_location IS NULL OR length(sub_location) <= 100);
ALTER TABLE public.gear_history ADD CONSTRAINT gear_history_sub_location_length CHECK (sub_location IS NULL OR length(sub_location) <= 100);