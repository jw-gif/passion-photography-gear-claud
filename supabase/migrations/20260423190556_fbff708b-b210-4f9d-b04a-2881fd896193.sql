CREATE OR REPLACE FUNCTION public.generate_gear_id()
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  alphabet text := 'abcdefghijkmnpqrstuvwxyz23456789';
  result text;
  i int;
  exists_check boolean;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..4 LOOP
      result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    SELECT EXISTS(SELECT 1 FROM public.gear WHERE id = result) INTO exists_check;
    EXIT WHEN NOT exists_check;
  END LOOP;
  RETURN result;
END;
$function$;