-- 1. Approval / signature evidence table
CREATE TABLE public.request_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transport_request_id uuid NOT NULL REFERENCES public.transport_requests(id) ON DELETE CASCADE,
  action text NOT NULL,
  actor_user_id uuid,
  actor_profile_id uuid REFERENCES public.profiles(id),
  actor_name text NOT NULL DEFAULT '',
  actor_role text NOT NULL DEFAULT '',
  signature_name text,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_request_approvals_request ON public.request_approvals(transport_request_id, created_at);

GRANT SELECT, INSERT ON public.request_approvals TO authenticated;
GRANT ALL ON public.request_approvals TO service_role;

ALTER TABLE public.request_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "approvals read own dept or staff" ON public.request_approvals
  FOR SELECT TO authenticated
  USING (
    public.is_staff(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.transport_requests r
      WHERE r.id = request_approvals.transport_request_id
        AND r.requesting_department_id = public.current_department_id()
    )
  );

CREATE POLICY "approvals insert" ON public.request_approvals
  FOR INSERT TO authenticated
  WITH CHECK (
    actor_user_id = auth.uid()
    AND (
      public.is_staff(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.transport_requests r
        WHERE r.id = request_approvals.transport_request_id
          AND r.requesting_department_id = public.current_department_id()
      )
    )
  );

-- 2. Session-level weekly detail
ALTER TABLE public.transport_request_days
  ADD COLUMN morning_departure_time time,
  ADD COLUMN morning_return_time time,
  ADD COLUMN morning_passengers integer,
  ADD COLUMN afternoon_departure_time time,
  ADD COLUMN afternoon_return_time time,
  ADD COLUMN afternoon_passengers integer;

UPDATE public.transport_request_days
SET morning_departure_time = departure_time,
    morning_return_time = return_time,
    morning_passengers = number_of_passengers
WHERE morning_requested;

UPDATE public.transport_request_days
SET afternoon_departure_time = departure_time,
    afternoon_return_time = return_time,
    afternoon_passengers = number_of_passengers
WHERE afternoon_requested;

-- 3. Signature + short-notice exception fields on requests
ALTER TABLE public.transport_requests
  ADD COLUMN requester_signature text,
  ADD COLUMN requester_signed_at timestamptz,
  ADD COLUMN approver_signature text,
  ADD COLUMN approved_by uuid REFERENCES public.profiles(id),
  ADD COLUMN approved_at timestamptz,
  ADD COLUMN is_short_notice boolean NOT NULL DEFAULT false,
  ADD COLUMN short_notice_reason text;

-- 4. Notice period becomes an auditable exception workflow
CREATE OR REPLACE FUNCTION public.enforce_notice_period()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_daily int;
  v_weekly int;
  v_start timestamptz;
  v_late boolean := false;
BEGIN
  IF NEW.status = 'draft' THEN RETURN NEW; END IF;

  SELECT COALESCE((SELECT NULLIF(value,'')::int FROM public.system_settings WHERE key = 'daily_notice_hours'), 24) INTO v_daily;
  SELECT COALESCE((SELECT NULLIF(value,'')::int FROM public.system_settings WHERE key = 'weekly_notice_days'), 3) INTO v_weekly;

  IF NEW.trip_from_date IS NULL THEN
    RAISE EXCEPTION 'A trip date is required.';
  END IF;

  IF NEW.request_type = 'daily' THEN
    v_start := (NEW.trip_from_date + COALESCE(NEW.preferred_departure_time, '00:00'::time))::timestamptz;
    v_late := v_start < now() + make_interval(hours => v_daily);
  ELSE
    v_late := NEW.trip_from_date < (CURRENT_DATE + v_weekly);
  END IF;

  IF NOT v_late THEN
    NEW.is_short_notice := false;
    RETURN NEW;
  END IF;

  IF public.is_staff(auth.uid()) THEN
    NEW.is_short_notice := true;
    RETURN NEW;
  END IF;

  IF COALESCE(btrim(NEW.short_notice_reason), '') = '' THEN
    IF NEW.request_type = 'daily' THEN
      RAISE EXCEPTION 'Daily transport requests must be submitted at least % hours before departure, or include a written short-notice justification.', v_daily;
    ELSE
      RAISE EXCEPTION 'Weekly transport requests must be submitted at least % days in advance, or include a written short-notice justification.', v_weekly;
    END IF;
  END IF;

  NEW.is_short_notice := true;
  RETURN NEW;
END; $function$;

-- 5. Notify logistics when a short-notice exception is claimed
CREATE OR REPLACE FUNCTION public.notify_short_notice()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.is_short_notice THEN
    PERFORM public.notify_staff(
      'Short-notice exception on ' || NEW.request_number,
      COALESCE(NEW.short_notice_reason, 'No reason recorded.'),
      'reminder', NEW.id);
  END IF;
  RETURN NEW;
END; $function$;

REVOKE EXECUTE ON FUNCTION public.notify_short_notice() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_short_notice_notify
AFTER INSERT ON public.transport_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_short_notice();