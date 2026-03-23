ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events FORCE ROW LEVEL SECURITY;
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memories FORCE ROW LEVEL SECURITY;

ALTER TABLE public.memories REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'memories'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.memories;
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.is_event_owner(target_event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.events e
    WHERE e.id = target_event_id
      AND (
        e.user_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role = 'admin'
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_live_event(target_event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.events e
    WHERE e.id = target_event_id
      AND COALESCE(e.is_expired, false) = false
      AND (e.expires_at IS NULL OR e.expires_at > NOW())
  );
$$;

REVOKE ALL ON FUNCTION public.is_event_owner(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_live_event(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_event_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_live_event(uuid) TO anon, authenticated;

DROP POLICY IF EXISTS "hosts_can_select_owned_events" ON public.events;
CREATE POLICY "hosts_can_select_owned_events"
ON public.events
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
);

DROP POLICY IF EXISTS "hosts_can_select_owned_memories" ON public.memories;
CREATE POLICY "hosts_can_select_owned_memories"
ON public.memories
FOR SELECT
TO authenticated
USING (public.is_event_owner(event_id));

DROP POLICY IF EXISTS "anon_can_select_approved_memories_for_live_events" ON public.memories;
CREATE POLICY "anon_can_select_approved_memories_for_live_events"
ON public.memories
FOR SELECT
TO anon
USING (
  is_approved = true
  AND public.is_live_event(event_id)
);

-- Anonymous guests stay anonymous in the current product model, so the database
-- cannot infer a single "current event" for the anon role. Event scoping for
-- guest Realtime is therefore enforced server-side by the subscription filter
-- on event_id, while RLS restricts anon visibility to approved memories on live events.
