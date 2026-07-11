-- ╔══════════════════════════════════════════════════════════════╗
-- ║  Augusta Dev — Supabase Migration                            ║
-- ║  Run this entire script in Supabase → SQL Editor             ║
-- ╚══════════════════════════════════════════════════════════════╝

-- ── 1. Events table ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.events (
  id                   text PRIMARY KEY,
  title                text NOT NULL DEFAULT '',
  category             text NOT NULL DEFAULT '',
  tag                  text NOT NULL DEFAULT 'Hackathon',
  description          text NOT NULL DEFAULT '',
  location             text NOT NULL DEFAULT '',
  format               text NOT NULL DEFAULT 'in-person',
  color                text NOT NULL DEFAULT 'purple',
  start_date           text NOT NULL DEFAULT '',
  end_date             text NOT NULL DEFAULT '',
  start_time           text NOT NULL DEFAULT '09:00',
  end_time             text NOT NULL DEFAULT '17:00',
  duration             text NOT NULL DEFAULT '',
  prize_pool           text NOT NULL DEFAULT '',
  max_teams            integer NOT NULL DEFAULT 0,
  current_teams        integer NOT NULL DEFAULT 0,
  max_participants     integer NOT NULL DEFAULT 0,
  current_participants integer NOT NULL DEFAULT 0,
  registration_open    boolean NOT NULL DEFAULT false,
  published            boolean NOT NULL DEFAULT false,
  tags                 text[] NOT NULL DEFAULT '{}',
  image                text,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

-- ── 2. Admins table ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admins (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email            text NOT NULL,
  granted_by_email text,
  created_at       timestamptz DEFAULT now()
);

-- ── 3. Helper: is current user an admin? ───────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid());
$$;

-- ── 4. Helper: look up a user's UUID by email (admin only) ─────
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(target_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE result uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT id INTO result FROM auth.users WHERE email = target_email LIMIT 1;
  RETURN result;
END;
$$;

-- ── 5. RLS: events ─────────────────────────────────────────────
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read published events" ON public.events;
CREATE POLICY "Public can read published events" ON public.events
  FOR SELECT USING (published = true);

DROP POLICY IF EXISTS "Admins can read all events" ON public.events;
CREATE POLICY "Admins can read all events" ON public.events
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert events" ON public.events;
CREATE POLICY "Admins can insert events" ON public.events
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update events" ON public.events;
CREATE POLICY "Admins can update events" ON public.events
  FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete events" ON public.events;
CREATE POLICY "Admins can delete events" ON public.events
  FOR DELETE USING (public.is_admin());

-- ── 6. RLS: admins ─────────────────────────────────────────────
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view admin list" ON public.admins;
CREATE POLICY "Admins can view admin list" ON public.admins
  FOR SELECT USING (public.is_admin());

-- First person to add themselves bootstraps the whole system (table empty check)
DROP POLICY IF EXISTS "Bootstrap or admin can add admins" ON public.admins;
CREATE POLICY "Bootstrap or admin can add admins" ON public.admins
  FOR INSERT WITH CHECK (
    public.is_admin()
    OR NOT EXISTS (SELECT 1 FROM public.admins LIMIT 1)
  );

DROP POLICY IF EXISTS "Admins can remove admins" ON public.admins;
CREATE POLICY "Admins can remove admins" ON public.admins
  FOR DELETE USING (public.is_admin());

-- ── 7. Seed events ─────────────────────────────────────────────
INSERT INTO public.events
  (id, title, category, tag, description, location, format, color,
   start_date, end_date, start_time, end_time, duration, prize_pool,
   max_teams, current_teams, max_participants, current_participants,
   registration_open, published, tags)
VALUES
  ('ctf-open-2026','Cybersecurity CTF Open','Security','Hackathon',
   'Capture the Flag competition featuring web exploitation, reverse engineering, and cryptography challenges for all skill levels.',
   'Augusta, GA','in-person','teal','2026-05-01','2026-05-02','09:00','21:00','36 hrs','$3,000',
   20,14,80,56,false,true,ARRAY['CTF','Web','Cryptography']),

  ('spring-build-weekend','Spring Build Weekend','Web Dev','Sprint',
   'Two-day local sprint focused on shipping production-ready apps with modern web technologies.',
   'Augusta, GA','in-person','orange','2026-05-09','2026-05-11','09:00','17:00','48 hrs','$2,500',
   16,8,64,32,false,true,ARRAY['React','Node.js','Web']),

  ('summer-code-jam','Summer Code Jam','Open Theme','Hackathon',
   'Open-theme summer hackathon. Build whatever inspires you — solo or in a team of up to four.',
   'Online','virtual','yellow','2026-06-14','2026-06-15','10:00','18:00','32 hrs','$4,000',
   30,28,120,112,false,true,ARRAY['Open Theme','Remote','Beginner Friendly']),

  ('augusta-dev-summit','Augusta Dev Summit','Summit','Summit',
   'Three days of talks, workshops, and building with the Augusta developer community. Our biggest event of the year.',
   'Augusta, GA','in-person','purple','2026-06-27','2026-06-29','09:00','18:00','72 hrs','Network',
   0,0,300,241,true,true,ARRAY['Networking','Talks','Workshops','Community']),

  ('founders-x-hackers','Founders x Hackers','Startup','Hackathon',
   'Pair with startup founders to build real MVPs in 48 hours. Walk away with equity, connections, or a job offer.',
   'Austin, TX','in-person','green','2026-07-10','2026-07-12','09:00','17:00','48 hrs','$5,000',
   25,11,150,44,true,true,ARRAY['Startup','MVP','React','Python']),

  ('ai-innovation-challenge','AI Innovation Challenge','AI / ML','Hackathon',
   'Build AI-powered applications that solve real-world problems. Open to all skill levels — mentors available throughout the event.',
   'Online','virtual','red','2026-07-25','2026-07-26','10:00','18:00','24 hrs','$5,000',
   24,7,96,28,true,true,ARRAY['Python','TensorFlow','OpenAI','LLM']),

  ('mobile-app-blitz','Mobile App Blitz','Mobile','Sprint',
   'Design and ship a fully functional mobile app in 36 hours. iOS, Android, or cross-platform — all welcome.',
   'Augusta, GA','in-person','teal','2026-08-08','2026-08-09','08:00','20:00','36 hrs','$1,500',
   12,0,48,0,false,true,ARRAY['React Native','Swift','Kotlin','Mobile']),

  ('pixelhack-2026','PixelHack 2026','Game Dev','Hackathon',
   '24-hour game dev sprint. Build anything playable from scratch — browser game, mobile, or desktop. All engines welcome.',
   'Online','virtual','red','2026-09-05','2026-09-06','12:00','12:00','24 hrs','$3,000',
   50,0,200,0,false,false,ARRAY['Game Dev','Unity','Godot','Creative'])
ON CONFLICT (id) DO NOTHING;

-- ── 8. Bootstrap: add yourself as the first admin ──────────────
-- After running this script, go to Supabase → Authentication → Users,
-- find your account, copy your User UID, then run:
--
--   INSERT INTO public.admins (user_id, email)
--   VALUES ('<your-user-uid>', '<your-email>');
--
-- After that, all admin management happens through the website UI.
