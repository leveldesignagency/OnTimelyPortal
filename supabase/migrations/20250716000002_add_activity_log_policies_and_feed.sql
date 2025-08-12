-- Enable RLS and add policies for activity_log, plus event activity feed RPC

-- Ensure table exists (noop if already created by earlier SQL)
CREATE TABLE IF NOT EXISTS public.activity_log (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL,
  event_id uuid NULL,
  user_id uuid NOT NULL,
  action_type text NOT NULL,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- Basic indexes
CREATE INDEX IF NOT EXISTS idx_activity_log_company ON public.activity_log(company_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_event ON public.activity_log(event_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON public.activity_log(created_at DESC);

-- RLS
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Select policy: users can view activity for their company
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'activity_log' AND policyname = 'select_company_activity'
  ) THEN
    CREATE POLICY select_company_activity ON public.activity_log
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.users u
          WHERE u.id = auth.uid() AND u.company_id = activity_log.company_id
        )
      );
  END IF;
END$$;

-- Insert policy: users can insert for their company and themselves
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'activity_log' AND policyname = 'insert_company_activity'
  ) THEN
    CREATE POLICY insert_company_activity ON public.activity_log
      FOR INSERT
      WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
          SELECT 1 FROM public.users u
          WHERE u.id = auth.uid() AND u.company_id = activity_log.company_id
        )
      );
  END IF;
END$$;

-- Optional update/delete policies (disabled by default)

-- Aggregated Event Activity feed RPC
CREATE OR REPLACE FUNCTION public.get_event_activity_feed(
  p_event_id uuid,
  p_company_id uuid,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
) RETURNS TABLE (
  item_type text,
  title text,
  description text,
  created_at timestamptz,
  actor_name text,
  actor_email text,
  source_id text
) LANGUAGE sql SECURITY DEFINER AS $$
  WITH msgs AS (
    SELECT
      'message'::text AS item_type,
      COALESCE(gcm.sender_name, 'Unknown') AS title,
      NULLIF(gcm.message_text,'') AS description,
      gcm.created_at,
      gcm.sender_name AS actor_name,
      gcm.sender_email AS actor_email,
      gcm.message_id::text AS source_id
    FROM public.guests_chat_messages gcm
    WHERE gcm.event_id::text = p_event_id::text AND gcm.company_id::text = p_company_id::text
  ), anns AS (
    SELECT
      'announcement'::text AS item_type,
      COALESCE(a.title, 'Announcement') AS title,
      NULLIF(a.description,'') AS description,
      COALESCE(a.updated_at, a.created_at) AS created_at,
      COALESCE(u.name, 'System') AS actor_name,
      u.email AS actor_email,
      a.id::text AS source_id
    FROM public.announcements a
    LEFT JOIN public.users u ON u.id = a.created_by::uuid
    WHERE a.event_id::text = p_event_id::text AND a.company_id::text = p_company_id::text
  ), mods AS (
    SELECT
      'module_answer'::text AS item_type,
      'Module answered'::text AS title,
      NULLIF(gma.answer_text,'') AS description,
      gma.created_at,
      COALESCE(u.name, g.first_name || ' ' || g.last_name, 'Participant') AS actor_name,
      COALESCE(u.email, g.email) AS actor_email,
      gma.id::text AS source_id
    FROM public.guest_module_answers gma
    LEFT JOIN public.users u ON u.id = gma.user_id::uuid
    LEFT JOIN public.guests g ON g.id = gma.guest_id::uuid
    WHERE gma.event_id::text = p_event_id::text
  ), itins AS (
    SELECT
      'itinerary'::text AS item_type,
      COALESCE(i.title, 'Itinerary updated') AS title,
      NULL::text AS description,
      COALESCE(i.updated_at, i.created_at) AS created_at,
      COALESCE(u.name, 'System') AS actor_name,
      u.email AS actor_email,
      i.id::text AS source_id
    FROM public.itineraries i
    LEFT JOIN public.users u ON u.id = i.created_by::uuid
    WHERE i.event_id::text = p_event_id::text AND i.company_id::text = p_company_id::text
  )
  SELECT * FROM (
    SELECT * FROM msgs
    UNION ALL
    SELECT * FROM anns
    UNION ALL
    SELECT * FROM mods
    UNION ALL
    SELECT * FROM itins
  ) t
  ORDER BY created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$;

GRANT EXECUTE ON FUNCTION public.get_event_activity_feed(uuid, uuid, integer, integer) TO authenticated, anon;

