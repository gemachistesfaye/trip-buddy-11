REVOKE EXECUTE ON FUNCTION public.current_driver_id() FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.restrict_driver_assignment_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF public.is_staff(auth.uid()) OR auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF NEW.driver_id IS DISTINCT FROM OLD.driver_id
     OR NEW.vehicle_id IS DISTINCT FROM OLD.vehicle_id
     OR NEW.transport_request_id IS DISTINCT FROM OLD.transport_request_id
     OR NEW.departure_datetime IS DISTINCT FROM OLD.departure_datetime
     OR NEW.expected_return_datetime IS DISTINCT FROM OLD.expected_return_datetime
     OR NEW.assigned_by IS DISTINCT FROM OLD.assigned_by THEN
    RAISE EXCEPTION 'Drivers may only record actual times, odometer readings and trip status.';
  END IF;
  IF NEW.status NOT IN ('in_progress','completed','assigned') THEN
    RAISE EXCEPTION 'Drivers may only start or complete a trip.';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_driver_update_guard ON public.transport_assignments;
CREATE TRIGGER trg_driver_update_guard BEFORE UPDATE ON public.transport_assignments
FOR EACH ROW EXECUTE FUNCTION public.restrict_driver_assignment_update();

REVOKE EXECUTE ON FUNCTION public.restrict_driver_assignment_update() FROM PUBLIC, anon, authenticated;