CREATE OR REPLACE FUNCTION public.notify_staff(_title text, _message text, _type public.notification_type, _request uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, related_request_id)
  SELECT ur.user_id, _title, _message, _type, _request
  FROM public.user_roles ur WHERE ur.role IN ('logistics_officer','admin');
END; $$;
REVOKE EXECUTE ON FUNCTION public.notify_staff(text, text, public.notification_type, uuid) FROM anon, authenticated, public;

CREATE OR REPLACE FUNCTION public.request_notifications()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_requester uuid;
  v_dept text;
BEGIN
  SELECT name INTO v_dept FROM public.departments WHERE id = NEW.requesting_department_id;
  SELECT auth_user_id INTO v_requester FROM public.profiles WHERE id = NEW.requester_id;

  IF TG_OP = 'INSERT' THEN
    PERFORM public.notify_staff(
      'New transport request ' || NEW.request_number,
      v_dept || ' submitted a ' || NEW.request_type || ' transport request to ' || COALESCE(NEW.destination,'(see details)') || '.',
      'request_submitted', NEW.id);
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status AND v_requester IS NOT NULL THEN
    IF NEW.status = 'approved' THEN
      INSERT INTO public.notifications (user_id, title, message, type, related_request_id)
      VALUES (v_requester, 'Request ' || NEW.request_number || ' approved',
        'Your transport request has been approved by Logistics.', 'request_approved', NEW.id);
    ELSIF NEW.status = 'rejected' THEN
      INSERT INTO public.notifications (user_id, title, message, type, related_request_id)
      VALUES (v_requester, 'Request ' || NEW.request_number || ' rejected',
        COALESCE(NEW.rejection_reason,'No reason provided.'), 'request_rejected', NEW.id);
    ELSIF NEW.status = 'assigned' THEN
      INSERT INTO public.notifications (user_id, title, message, type, related_request_id)
      VALUES (v_requester, 'Vehicle assigned for ' || NEW.request_number,
        'A vehicle and driver have been assigned to your trip.', 'vehicle_assigned', NEW.id);
    ELSIF NEW.status = 'cancelled' THEN
      INSERT INTO public.notifications (user_id, title, message, type, related_request_id)
      VALUES (v_requester, 'Request ' || NEW.request_number || ' cancelled',
        'This transport request has been cancelled.', 'request_cancelled', NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_request_notify AFTER INSERT OR UPDATE ON public.transport_requests
FOR EACH ROW EXECUTE FUNCTION public.request_notifications();

CREATE OR REPLACE FUNCTION public.write_audit_log()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
  VALUES (auth.uid(), lower(TG_OP), TG_TABLE_NAME,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END);
  RETURN COALESCE(NEW, OLD);
END; $$;

CREATE TRIGGER trg_audit_requests AFTER INSERT OR UPDATE OR DELETE ON public.transport_requests
FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();
CREATE TRIGGER trg_audit_assignments AFTER INSERT OR UPDATE OR DELETE ON public.transport_assignments
FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();
CREATE TRIGGER trg_audit_vehicles AFTER INSERT OR UPDATE OR DELETE ON public.vehicles
FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();
CREATE TRIGGER trg_audit_drivers AFTER INSERT OR UPDATE OR DELETE ON public.drivers
FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();