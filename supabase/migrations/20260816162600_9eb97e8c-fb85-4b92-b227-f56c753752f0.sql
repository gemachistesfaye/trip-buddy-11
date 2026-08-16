CREATE OR REPLACE FUNCTION public.current_driver_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id FROM public.drivers WHERE auth_user_id = auth.uid();
$$;

DROP POLICY IF EXISTS "assignments driver read" ON public.transport_assignments;
CREATE POLICY "assignments driver read" ON public.transport_assignments
FOR SELECT TO authenticated
USING (driver_id = public.current_driver_id());

DROP POLICY IF EXISTS "assignments driver update" ON public.transport_assignments;
CREATE POLICY "assignments driver update" ON public.transport_assignments
FOR UPDATE TO authenticated
USING (driver_id = public.current_driver_id())
WITH CHECK (driver_id = public.current_driver_id());

DROP POLICY IF EXISTS "requests driver read" ON public.transport_requests;
CREATE POLICY "requests driver read" ON public.transport_requests
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.transport_assignments a
  WHERE a.transport_request_id = transport_requests.id
    AND a.driver_id = public.current_driver_id()
));

DROP POLICY IF EXISTS "drivers self update" ON public.drivers;
CREATE POLICY "drivers self update" ON public.drivers
FOR UPDATE TO authenticated
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());