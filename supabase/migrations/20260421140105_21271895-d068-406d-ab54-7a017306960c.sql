
-- Gear items table
CREATE TABLE public.gear (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  current_location TEXT NOT NULL DEFAULT '515',
  last_note TEXT,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- History entries
CREATE TABLE public.gear_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gear_id INTEGER NOT NULL REFERENCES public.gear(id) ON DELETE CASCADE,
  location TEXT NOT NULL,
  note TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_gear_history_gear_id ON public.gear_history(gear_id, timestamp DESC);

-- Enable RLS
ALTER TABLE public.gear ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gear_history ENABLE ROW LEVEL SECURITY;

-- Public read + write (no login required for the public update form)
CREATE POLICY "anyone can read gear" ON public.gear FOR SELECT USING (true);
CREATE POLICY "anyone can update gear" ON public.gear FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "anyone can read history" ON public.gear_history FOR SELECT USING (true);
CREATE POLICY "anyone can insert history" ON public.gear_history FOR INSERT WITH CHECK (true);

-- Seed inventory
INSERT INTO public.gear (id, name) VALUES
  (1, 'Canon 70-200 (1)'),
  (2, 'Canon 70-200 (2)'),
  (3, 'Canon 35mm'),
  (4, 'Canon 85mm'),
  (5, 'Canon 14mm (1)'),
  (6, 'Canon 24-105mm'),
  (7, 'Canon 16-35mm'),
  (8, 'Canon 14mm (2)'),
  (9, 'Canon R6'),
  (10, 'Canon R5'),
  (11, 'Profoto A10 for Canon'),
  (12, 'Nikon 14-24mm'),
  (13, 'Nikon 70-200mm'),
  (14, 'Profoto B10');
