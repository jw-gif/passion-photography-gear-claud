
-- Location blocks
CREATE TABLE public.shot_list_location_blocks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  alias text,
  address text NOT NULL DEFAULT '',
  arrival text NOT NULL DEFAULT '',
  editing_space text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shot_list_location_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone reads location blocks"
  ON public.shot_list_location_blocks FOR SELECT
  USING (true);

CREATE POLICY "admins insert location blocks"
  ON public.shot_list_location_blocks FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admins update location blocks"
  ON public.shot_list_location_blocks FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admins delete location blocks"
  ON public.shot_list_location_blocks FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Segment blocks (with shots stored as JSONB array of {key,text,priority})
CREATE TABLE public.shot_list_segment_blocks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  title text NOT NULL,
  default_location text,
  default_roles text[] NOT NULL DEFAULT ARRAY['all']::text[],
  focus text,
  shots jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shot_list_segment_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone reads segment blocks"
  ON public.shot_list_segment_blocks FOR SELECT
  USING (true);

CREATE POLICY "admins insert segment blocks"
  ON public.shot_list_segment_blocks FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admins update segment blocks"
  ON public.shot_list_segment_blocks FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admins delete segment blocks"
  ON public.shot_list_segment_blocks FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Templates
CREATE TABLE public.shot_list_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  location_key text,
  segment_keys text[] NOT NULL DEFAULT ARRAY[]::text[],
  roles text[] NOT NULL DEFAULT ARRAY['point','door_holder']::text[],
  call_time text,
  wrap_time text,
  details_notes text,
  gear_notes text,
  editing_notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shot_list_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone reads templates"
  ON public.shot_list_templates FOR SELECT
  USING (true);

CREATE POLICY "admins insert templates"
  ON public.shot_list_templates FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admins update templates"
  ON public.shot_list_templates FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admins delete templates"
  ON public.shot_list_templates FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.touch_shot_list_blocks_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER touch_location_blocks_updated_at
  BEFORE UPDATE ON public.shot_list_location_blocks
  FOR EACH ROW EXECUTE FUNCTION public.touch_shot_list_blocks_updated_at();

CREATE TRIGGER touch_segment_blocks_updated_at
  BEFORE UPDATE ON public.shot_list_segment_blocks
  FOR EACH ROW EXECUTE FUNCTION public.touch_shot_list_blocks_updated_at();

CREATE TRIGGER touch_templates_updated_at
  BEFORE UPDATE ON public.shot_list_templates
  FOR EACH ROW EXECUTE FUNCTION public.touch_shot_list_blocks_updated_at();

-- Seed locations
INSERT INTO public.shot_list_location_blocks (key, label, alias, address, arrival, editing_space, sort_order) VALUES
('515', '515', NULL, '515 Glenn Iris Dr NE, Atlanta, GA',
  'Park in the lower lot behind the building. Enter through the side door by the loading dock — it''ll be propped open. Find Mac (or whoever is leading the shoot) at the photo cart in the AUD.',
  'Editing happens in the Creative Suite on the 2nd floor. Head up the back stairwell, take a right at the top, and the Creative Suite is the second door on the left. Plug in at the long table by the windows.',
  10),
('Cumberland', 'Cumberland', 'CBL', '2625 Cumberland Parkway Southeast, Atlanta, GA',
  'When you arrive, the lower gate that goes under the skybridge should be open, pull in and park wherever you see other cars parked. Check-in is at the very far side door of the central building.',
  'Take the elevator in the Central Building up to the 4th floor (you''ll need to use the door code to activate the button). When you exit the elevator, take a left and then a right through the double doors. The catering space is the first single door on the left. Our unofficial table is next to the column by the window next to the power strip.',
  20),
('Trilith', 'Trilith', 'TRL', '350 Trilith Pkwy, Fayetteville, GA',
  'Park in the lot directly in front of the building. Enter through the main lobby doors and check in at the front desk — they''ll point you toward the AUD.',
  'Set up in the Office on the upper level. From the lobby, take the stairs up, head right past the kitchen, and the Office is the door at the end of the hallway. Use the photo cart corner near the window.',
  30);

-- Seed segments
INSERT INTO public.shot_list_segment_blocks (key, title, default_location, default_roles, focus, shots, sort_order) VALUES
('pre_gathering', 'Pre-Gathering', 'Outside / Lobby', ARRAY['all']::text[],
  'Let''s focus on shots of people and smiling faces.',
  '[
    {"key":"pre_walkup","text":"People walking up to the building","priority":"should"},
    {"key":"pre_greeters","text":"Greeters at the door","priority":"must"},
    {"key":"pre_lobby","text":"Coffee + connection in the lobby","priority":"should"},
    {"key":"pre_first_time","text":"First-time guests at the welcome desk","priority":"nice"},
    {"key":"pre_signage","text":"Branded signage / wayfinding details","priority":"nice"},
    {"key":"pre_team","text":"Team members praying together before doors","priority":"should"}
  ]'::jsonb, 10),
('worship', 'Worship (AUD)', 'AUD', ARRAY['point']::text[],
  'Centered & off-centered framed with the LED wall.',
  '[
    {"key":"wor_wide_high","text":"Wide from highest point during opening song","priority":"must"},
    {"key":"wor_hands","text":"Tight on hands raised in worship","priority":"must"},
    {"key":"wor_leader","text":"Worship leader mid-vocal","priority":"should"},
    {"key":"wor_crowd","text":"Crowd singing — variety of faces","priority":"should"},
    {"key":"wor_band","text":"Band members in the moment (drummer, guitarist, BVs)","priority":"should"},
    {"key":"wor_led_silhouette","text":"Centered framing of the LED wall with worship leader silhouette","priority":"nice"}
  ]'::jsonb, 20),
('hosting_giving', 'Hosting + Giving (AUD)', 'AUD', ARRAY['point']::text[], NULL,
  '[
    {"key":"host_welcome","text":"Host welcoming the room","priority":"must"},
    {"key":"host_announcements","text":"Crowd reaction shots during announcements","priority":"should"},
    {"key":"host_giving","text":"People giving / scanning QR codes","priority":"nice"}
  ]'::jsonb, 30),
('talk', 'Talk (AUD)', 'AUD', ARRAY['point']::text[],
  'Get the speaker mid-laugh and mid-point.',
  '[
    {"key":"talk_wide_led","text":"Speaker wide with LED wall","priority":"must"},
    {"key":"talk_laugh","text":"Speaker mid-laugh / mid-gesture","priority":"must"},
    {"key":"talk_notes","text":"Audience taking notes","priority":"should"},
    {"key":"talk_scripture","text":"Scripture on the LED wall with audience in foreground","priority":"should"},
    {"key":"talk_close","text":"Tight portrait of the speaker","priority":"nice"}
  ]'::jsonb, 40),
('passion_kids', 'Passion Kids + bloom', 'Kids Room', ARRAY['door_holder','training_door_holder']::text[],
  'Capture the energy and the leaders connecting with kids.',
  '[
    {"key":"kids_running","text":"Kids running into the room with their leaders","priority":"must"},
    {"key":"kids_worship","text":"Worship time — kids singing/dancing","priority":"must"},
    {"key":"kids_teaching","text":"Leaders teaching","priority":"should"},
    {"key":"kids_smallgroup","text":"Small group / craft time","priority":"should"},
    {"key":"kids_pickup","text":"Pickup — parents reuniting with kids","priority":"nice"}
  ]'::jsonb, 50),
('middle_school', 'Middle School', 'MS Room', ARRAY['door_holder','training_door_holder']::text[], NULL,
  '[
    {"key":"ms_hangout","text":"Pre-service hangout / games","priority":"should"},
    {"key":"ms_worship","text":"Worship — students engaged","priority":"must"},
    {"key":"ms_teaching","text":"Speaker on stage with students in foreground","priority":"must"},
    {"key":"ms_leaders","text":"Leaders praying with students","priority":"should"}
  ]'::jsonb, 60),
('family_groups', 'Family Groups', 'Lobby', ARRAY['door_holder']::text[], NULL,
  '[
    {"key":"fg_gathering","text":"Families gathering / catching up","priority":"should"},
    {"key":"fg_kids","text":"Kids playing during family groups","priority":"nice"},
    {"key":"fg_conversation","text":"Adults in conversation — natural moments","priority":"should"}
  ]'::jsonb, 70),
('baptisms', 'One-Offs / Baptisms', 'AUD', ARRAY['point']::text[],
  'Get the moment of the dunk + the celebration after.',
  '[
    {"key":"bap_walkup","text":"Person walking up to the baptism pool","priority":"should"},
    {"key":"bap_dunk","text":"The dunk — wide and tight","priority":"must"},
    {"key":"bap_celebration","text":"Celebration / hugs after coming up","priority":"must"},
    {"key":"bap_crowd","text":"Crowd reaction during baptism","priority":"should"}
  ]'::jsonb, 80),
('editing_uploading', 'Editing + Uploading', NULL, ARRAY['all']::text[], NULL,
  '[
    {"key":"edit_cull","text":"Cull and edit within 48 hours","priority":"must"},
    {"key":"edit_upload","text":"Upload to shared drive — folder named YYYY-MM-DD Sunday","priority":"must"},
    {"key":"edit_export","text":"Export full-res JPEGs with Passion preset","priority":"should"}
  ]'::jsonb, 90);

-- Seed templates
INSERT INTO public.shot_list_templates (name, description, location_key, segment_keys, roles, call_time, wrap_time, sort_order) VALUES
('Sunday 515', 'Standard Sunday gathering at 515', '515',
  ARRAY['pre_gathering','worship','hosting_giving','talk','passion_kids','family_groups','editing_uploading']::text[],
  ARRAY['point','door_holder']::text[], '8:00 AM', '12:30 PM', 10),
('Sunday Cumberland', 'Standard Sunday gathering at Cumberland (CBL)', 'Cumberland',
  ARRAY['pre_gathering','worship','hosting_giving','talk','passion_kids','middle_school','family_groups','editing_uploading']::text[],
  ARRAY['point','door_holder']::text[], '8:00 AM', '12:30 PM', 20),
('Sunday Trilith', 'Standard Sunday gathering at Trilith', 'Trilith',
  ARRAY['pre_gathering','worship','hosting_giving','talk','passion_kids','family_groups','editing_uploading']::text[],
  ARRAY['point','door_holder']::text[], '8:00 AM', '12:30 PM', 30);
