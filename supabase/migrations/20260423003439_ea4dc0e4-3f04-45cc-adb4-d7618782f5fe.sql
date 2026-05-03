CREATE OR REPLACE FUNCTION public.tier_rank(t public.photographer_tier)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE t
    WHEN 'point' THEN 3
    WHEN 'door_holder' THEN 2
    WHEN 'training_door_holder' THEN 1
  END
$$;