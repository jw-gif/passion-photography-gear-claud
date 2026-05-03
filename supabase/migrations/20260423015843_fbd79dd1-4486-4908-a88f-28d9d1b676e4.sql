ALTER TABLE public.gear_requests
  ADD COLUMN IF NOT EXISTS photo_request_id uuid REFERENCES public.photo_requests(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_gear_requests_photo_request_id
  ON public.gear_requests(photo_request_id);