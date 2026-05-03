-- Shared onboarding pages (Welcome, Process, Tools, Teams, Who to ask)
CREATE TABLE public.onboarding_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT,
  blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.onboarding_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated read onboarding_pages"
  ON public.onboarding_pages FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "admins insert onboarding_pages"
  ON public.onboarding_pages FOR INSERT
  TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admins update onboarding_pages"
  ON public.onboarding_pages FOR UPDATE
  TO authenticated USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admins delete onboarding_pages"
  ON public.onboarding_pages FOR DELETE
  TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER touch_onboarding_pages_updated_at
  BEFORE UPDATE ON public.onboarding_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_shot_list_updated_at();

-- New hires
CREATE TABLE public.onboarding_hires (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role_label TEXT,
  start_date DATE NOT NULL,
  coordinator_name TEXT,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.onboarding_hires ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read all hires"
  ON public.onboarding_hires FOR SELECT
  TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "hire reads own row"
  ON public.onboarding_hires FOR SELECT
  TO authenticated USING (user_id = auth.uid());

CREATE POLICY "admins insert hires"
  ON public.onboarding_hires FOR INSERT
  TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admins update hires"
  ON public.onboarding_hires FOR UPDATE
  TO authenticated USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admins delete hires"
  ON public.onboarding_hires FOR DELETE
  TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER touch_onboarding_hires_updated_at
  BEFORE UPDATE ON public.onboarding_hires
  FOR EACH ROW EXECUTE FUNCTION public.update_shot_list_updated_at();

-- Per-hire first-month timeline
CREATE TABLE public.onboarding_hire_timeline (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hire_id UUID NOT NULL REFERENCES public.onboarding_hires(id) ON DELETE CASCADE,
  day_offset INTEGER NOT NULL DEFAULT 0,
  label TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.onboarding_hire_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read timeline"
  ON public.onboarding_hire_timeline FOR SELECT
  TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "hire reads own timeline"
  ON public.onboarding_hire_timeline FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.onboarding_hires h WHERE h.id = hire_id AND h.user_id = auth.uid())
  );

CREATE POLICY "admins insert timeline"
  ON public.onboarding_hire_timeline FOR INSERT
  TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admins update timeline"
  ON public.onboarding_hire_timeline FOR UPDATE
  TO authenticated USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admins delete timeline"
  ON public.onboarding_hire_timeline FOR DELETE
  TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER touch_onboarding_hire_timeline_updated_at
  BEFORE UPDATE ON public.onboarding_hire_timeline
  FOR EACH ROW EXECUTE FUNCTION public.update_shot_list_updated_at();

CREATE INDEX idx_onboarding_hire_timeline_hire ON public.onboarding_hire_timeline(hire_id);

-- Per-hire checklist
CREATE TABLE public.onboarding_hire_checklist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hire_id UUID NOT NULL REFERENCES public.onboarding_hires(id) ON DELETE CASCADE,
  section TEXT NOT NULL DEFAULT 'General',
  label TEXT NOT NULL,
  owner TEXT,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.onboarding_hire_checklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read checklist"
  ON public.onboarding_hire_checklist FOR SELECT
  TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "hire reads own checklist"
  ON public.onboarding_hire_checklist FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.onboarding_hires h WHERE h.id = hire_id AND h.user_id = auth.uid())
  );

CREATE POLICY "admins insert checklist"
  ON public.onboarding_hire_checklist FOR INSERT
  TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admins update checklist"
  ON public.onboarding_hire_checklist FOR UPDATE
  TO authenticated USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "hire updates own checklist completion"
  ON public.onboarding_hire_checklist FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.onboarding_hires h WHERE h.id = hire_id AND h.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.onboarding_hires h WHERE h.id = hire_id AND h.user_id = auth.uid())
  );

CREATE POLICY "admins delete checklist"
  ON public.onboarding_hire_checklist FOR DELETE
  TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER touch_onboarding_hire_checklist_updated_at
  BEFORE UPDATE ON public.onboarding_hire_checklist
  FOR EACH ROW EXECUTE FUNCTION public.update_shot_list_updated_at();

CREATE INDEX idx_onboarding_hire_checklist_hire ON public.onboarding_hire_checklist(hire_id);

-- Seed the 5 shared pages with empty content so admins can edit them in the UI
INSERT INTO public.onboarding_pages (slug, title, subtitle, sort_order, blocks) VALUES
  ('welcome', 'Welcome', 'Start here', 0, '[]'::jsonb),
  ('process', 'Process', 'How we work', 1, '[]'::jsonb),
  ('tools', 'Tools', 'What we use', 2, '[]'::jsonb),
  ('teams', 'Teams', 'Who does what', 3, '[]'::jsonb),
  ('who-to-ask', 'Who to ask', 'Find the right person', 4, '[]'::jsonb);
