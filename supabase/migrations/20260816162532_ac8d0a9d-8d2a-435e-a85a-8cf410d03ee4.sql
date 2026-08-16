ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'driver';

ALTER TABLE public.transport_assignments
  ADD COLUMN IF NOT EXISTS actual_departure_datetime timestamptz,
  ADD COLUMN IF NOT EXISTS actual_return_datetime timestamptz,
  ADD COLUMN IF NOT EXISTS odometer_start integer,
  ADD COLUMN IF NOT EXISTS odometer_end integer;

ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS current_odometer integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS service_interval_km integer NOT NULL DEFAULT 5000,
  ADD COLUMN IF NOT EXISTS last_service_odometer integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_service_date date,
  ADD COLUMN IF NOT EXISTS next_service_due_date date;

ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS auth_user_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS drivers_auth_user_id_key ON public.drivers(auth_user_id) WHERE auth_user_id IS NOT NULL;

INSERT INTO public.system_settings (key, value, description) VALUES
  ('max_driver_daily_hours','10','Maximum hours a driver may be assigned to trips in one day'),
  ('unassigned_escalation_hours','12','Hours an approved request may wait without a vehicle before supervisors are alerted'),
  ('monthly_department_trip_quota','20','Indicative number of trips a department may use per month'),
  ('default_service_interval_km','5000','Default kilometres between vehicle services')
ON CONFLICT (key) DO NOTHING;

-- Notice period enforced server-side
CREATE OR REPLACE FUNCTION public.enforce_notice_period()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_daily int;
  v_weekly int;
  v_start timestamptz;
BEGIN
  IF NEW.status = 'draft' THEN RETURN NEW; END IF;
  IF public.is_staff(auth.uid()) THEN RETURN NEW; END IF;

  SELECT COALESCE((SELECT NULLIF(value,'')::int FROM public.system_settings WHERE key = 'daily_notice_hours'), 24) INTO v_daily;
  SELECT COALESCE((SELECT NULLIF(value,'')::int FROM public.system_settings WHERE key = 'weekly_notice_days'), 3) INTO v_weekly;

  IF NEW.trip_from_date IS NULL THEN
    RAISE EXCEPTION 'A trip date is required.';
  END IF;

  IF NEW.request_type = 'daily' THEN
    v_start := (NEW.trip_from_date + COALESCE(NEW.preferred_departure_time, '00:00'::time))::timestamptz;
    IF v_start < now() + make_interval(hours => v_daily) THEN
      RAISE EXCEPTION 'Daily transport requests must be submitted at least % hours before departure.', v_daily;
    END IF;
  ELSE
    IF NEW.trip_from_date < (CURRENT_DATE + v_weekly) THEN
      RAISE EXCEPTION 'Weekly transport requests must be submitted at least % days in advance.', v_weekly;
    END IF;
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notice_period ON public.transport_requests;
CREATE TRIGGER trg_notice_period BEFORE INSERT ON public.transport_requests
FOR EACH ROW EXECUTE FUNCTION public.enforce_notice_period();

REVOKE EXECUTE ON FUNCTION public.enforce_notice_period() FROM PUBLIC, anon, authenticated;

-- Driver daily hours limit, enforced alongside double-booking
CREATE OR REPLACE FUNCTION public.prevent_double_booking()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_max_hours numeric;
  v_hours numeric;
BEGIN
  IF NEW.status IN ('cancelled','completed') THEN RETURN NEW; END IF;
  IF EXISTS (
    SELECT 1 FROM public.transport_assignments a
    WHERE a.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND a.vehicle_id = NEW.vehicle_id
      AND a.status IN ('assigned','in_progress')
      AND a.departure_datetime < NEW.expected_return_datetime
      AND a.expected_return_datetime > NEW.departure_datetime
  ) THEN
    RAISE EXCEPTION 'Vehicle is unavailable during the requested time.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.transport_assignments a
    WHERE a.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND a.driver_id = NEW.driver_id
      AND a.status IN ('assigned','in_progress')
      AND a.departure_datetime < NEW.expected_return_datetime
      AND a.expected_return_datetime > NEW.departure_datetime
  ) THEN
    RAISE EXCEPTION 'Driver is unavailable during the requested time.';
  END IF;

  SELECT COALESCE((SELECT NULLIF(value,'')::numeric FROM public.system_settings WHERE key = 'max_driver_daily_hours'), 10)
    INTO v_max_hours;

  SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (a.expected_return_datetime - a.departure_datetime)) / 3600), 0)
    INTO v_hours
  FROM public.transport_assignments a
  WHERE a.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND a.driver_id = NEW.driver_id
    AND a.status IN ('assigned','in_progress')
    AND a.departure_datetime::date = NEW.departure_datetime::date;

  v_hours := v_hours + EXTRACT(EPOCH FROM (NEW.expected_return_datetime - NEW.departure_datetime)) / 3600;

  IF v_hours > v_max_hours THEN
    RAISE EXCEPTION 'Driver hours limit exceeded: this trip would put the driver at %.1f hours on that day (limit %).', v_hours, v_max_hours;
  END IF;

  RETURN NEW;
END; $$;

-- Trip completion syncs odometer and maintenance state
CREATE OR REPLACE FUNCTION public.sync_vehicle_on_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_interval int;
  v_last int;
  v_due date;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    IF NEW.odometer_end IS NOT NULL THEN
      UPDATE public.vehicles
        SET current_odometer = GREATEST(current_odometer, NEW.odometer_end)
        WHERE id = NEW.vehicle_id;
    END IF;

    SELECT service_interval_km, last_service_odometer, next_service_due_date
      INTO v_interval, v_last, v_due
    FROM public.vehicles WHERE id = NEW.vehicle_id;

    UPDATE public.vehicles v
      SET current_status = 'maintenance'
      WHERE v.id = NEW.vehicle_id
        AND v.current_status IN ('available','assigned')
        AND (
          (v_interval > 0 AND v.current_odometer - COALESCE(v_last,0) >= v_interval)
          OR (v_due IS NOT NULL AND v_due <= CURRENT_DATE)
        );

    UPDATE public.drivers SET status = 'available'
      WHERE id = NEW.driver_id AND status = 'assigned';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_assignment_completion ON public.transport_assignments;
CREATE TRIGGER trg_assignment_completion AFTER UPDATE ON public.transport_assignments
FOR EACH ROW EXECUTE FUNCTION public.sync_vehicle_on_completion();

REVOKE EXECUTE ON FUNCTION public.sync_vehicle_on_completion() FROM PUBLIC, anon, authenticated;

-- Audit trail for settings changes (who loosened the notice period, and when)
DROP TRIGGER IF EXISTS trg_audit_settings ON public.system_settings;
CREATE TRIGGER trg_audit_settings AFTER INSERT OR UPDATE OR DELETE ON public.system_settings
FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();

-- Escalation: alert staff about approved requests still waiting for a vehicle
CREATE OR REPLACE FUNCTION public.escalate_unassigned_requests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_hours int;
  r record;
BEGIN
  SELECT COALESCE((SELECT NULLIF(value,'')::int FROM public.system_settings WHERE key = 'unassigned_escalation_hours'), 12)
    INTO v_hours;

  FOR r IN
    SELECT tr.id, tr.request_number
    FROM public.transport_requests tr
    WHERE tr.status = 'approved'
      AND COALESCE(tr.reviewed_at, tr.updated_at) < now() - make_interval(hours => v_hours)
      AND NOT EXISTS (SELECT 1 FROM public.transport_assignments a WHERE a.transport_request_id = tr.id)
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.related_request_id = tr.id AND n.type = 'reminder'
          AND n.created_at > now() - make_interval(hours => v_hours)
      )
  LOOP
    PERFORM public.notify_staff(
      'Approved request ' || r.request_number || ' still has no vehicle',
      'This request was approved over ' || v_hours || ' hours ago and no vehicle or driver has been assigned yet.',
      'reminder', r.id);
  END LOOP;
END; $$;

REVOKE EXECUTE ON FUNCTION public.escalate_unassigned_requests() FROM PUBLIC, anon, authenticated;

CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.unschedule('escalate-unassigned-requests')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'escalate-unassigned-requests');
SELECT cron.schedule('escalate-unassigned-requests', '0 * * * *', $$SELECT public.escalate_unassigned_requests();$$);