-- Status enum
CREATE TYPE public.gear_request_status AS ENUM ('pending', 'approved', 'denied');

-- Main requests table
CREATE TABLE public.gear_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requestor_name text NOT NULL,
  location text NOT NULL,
  needed_date date NOT NULL,
  notes text,
  status public.gear_request_status NOT NULL DEFAULT 'pending',
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Junction table for requested gear items
CREATE TABLE public.gear_request_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.gear_requests(id) ON DELETE CASCADE,
  gear_id integer NOT NULL REFERENCES public.gear(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_gear_request_items_request_id ON public.gear_request_items(request_id);
CREATE INDEX idx_gear_requests_needed_date ON public.gear_requests(needed_date);
CREATE INDEX idx_gear_requests_status ON public.gear_requests(status);

-- RLS
ALTER TABLE public.gear_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gear_request_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read gear_requests" ON public.gear_requests FOR SELECT USING (true);
CREATE POLICY "anyone can insert gear_requests" ON public.gear_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "anyone can update gear_requests" ON public.gear_requests FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "anyone can delete gear_requests" ON public.gear_requests FOR DELETE USING (true);

CREATE POLICY "anyone can read gear_request_items" ON public.gear_request_items FOR SELECT USING (true);
CREATE POLICY "anyone can insert gear_request_items" ON public.gear_request_items FOR INSERT WITH CHECK (true);
CREATE POLICY "anyone can update gear_request_items" ON public.gear_request_items FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "anyone can delete gear_request_items" ON public.gear_request_items FOR DELETE USING (true);