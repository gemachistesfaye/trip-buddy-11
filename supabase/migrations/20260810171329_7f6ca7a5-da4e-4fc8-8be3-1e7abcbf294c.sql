-- ENUMS
CREATE TYPE public.app_role AS ENUM ('department_user','logistics_officer','admin');
CREATE TYPE public.vehicle_status AS ENUM ('available','assigned','maintenance','unavailable');
CREATE TYPE public.driver_status AS ENUM ('available','assigned','unavailable','leave');
CREATE TYPE public.request_type AS ENUM ('daily','weekly');
CREATE TYPE public.request_status AS ENUM ('draft','submitted','under_review','approved','rejected','assigned','in_progress','completed','cancelled');
CREATE TYPE public.assignment_status AS ENUM ('assigned','in_progress','completed','cancelled');
CREATE TYPE public.notification_type AS ENUM ('request_submitted','request_approved','request_rejected','vehicle_assigned','request_cancelled','reminder','system');

-- UPDATED_AT HELPER
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- DEPARTMENTS
CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  contact_name text,
  contact_phone text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.departments TO authenticated;
GRANT ALL ON public.departments TO service_role;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_departments_updated BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- USER ROLES
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('logistics_officer','admin'));
$$;

CREATE OR REPLACE FUNCTION public.current_department_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT department_id FROM public.profiles WHERE auth_user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.profiles WHERE auth_user_id = auth.uid();
$$;

-- SIGNUP TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role public.app_role;
  v_dept uuid;
BEGIN
  BEGIN
    v_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'department_user');
  EXCEPTION WHEN others THEN v_role := 'department_user';
  END;
  BEGIN
    v_dept := NULLIF(NEW.raw_user_meta_data->>'department_id','')::uuid;
  EXCEPTION WHEN others THEN v_dept := NULL;
  END;

  INSERT INTO public.profiles (auth_user_id, full_name, email, phone, department_id)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), COALESCE(NEW.email,''), NEW.raw_user_meta_data->>'phone', v_dept);

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- DRIVERS
CREATE TABLE public.drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text,
  license_number text,
  status public.driver_status NOT NULL DEFAULT 'available',
  assigned_vehicle_id uuid,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.drivers TO authenticated;
GRANT ALL ON public.drivers TO service_role;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_drivers_updated BEFORE UPDATE ON public.drivers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- VEHICLES
CREATE TABLE public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plate_number text NOT NULL UNIQUE,
  vehicle_type text NOT NULL DEFAULT 'Sedan',
  model text,
  passenger_capacity integer NOT NULL DEFAULT 4,
  current_status public.vehicle_status NOT NULL DEFAULT 'available',
  assigned_driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicles TO authenticated;
GRANT ALL ON public.vehicles TO service_role;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_vehicles_updated BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.drivers ADD CONSTRAINT drivers_vehicle_fk FOREIGN KEY (assigned_vehicle_id) REFERENCES public.vehicles(id) ON DELETE SET NULL;

-- REQUEST NUMBER SEQUENCE
CREATE SEQUENCE public.transport_request_seq START 1;

-- TRANSPORT REQUESTS
CREATE TABLE public.transport_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number text NOT NULL UNIQUE DEFAULT ('TR-' || lpad(nextval('public.transport_request_seq')::text, 4, '0')),
  request_type public.request_type NOT NULL,
  requesting_department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
  requester_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  contact_number text,
  request_date date NOT NULL DEFAULT current_date,
  trip_from_date date,
  trip_to_date date,
  number_of_passengers integer,
  destination text,
  preferred_departure_time time,
  estimated_return_time time,
  purpose text,
  goods_carried text,
  status public.request_status NOT NULL DEFAULT 'submitted',
  rejection_reason text,
  remarks text,
  submitted_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transport_requests TO authenticated;
GRANT ALL ON public.transport_requests TO service_role;
GRANT USAGE ON SEQUENCE public.transport_request_seq TO authenticated, service_role;
ALTER TABLE public.transport_requests ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_requests_updated BEFORE UPDATE ON public.transport_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- WEEKLY DAYS
CREATE TABLE public.transport_request_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transport_request_id uuid NOT NULL REFERENCES public.transport_requests(id) ON DELETE CASCADE,
  trip_date date NOT NULL,
  morning_requested boolean NOT NULL DEFAULT false,
  afternoon_requested boolean NOT NULL DEFAULT false,
  departure_time time,
  return_time time,
  destination text,
  number_of_passengers integer,
  purpose text,
  goods_carried text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transport_request_days TO authenticated;
GRANT ALL ON public.transport_request_days TO service_role;
ALTER TABLE public.transport_request_days ENABLE ROW LEVEL SECURITY;

-- ASSIGNMENTS
CREATE TABLE public.transport_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transport_request_id uuid NOT NULL REFERENCES public.transport_requests(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE RESTRICT,
  assigned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  assignment_date date NOT NULL DEFAULT current_date,
  departure_datetime timestamptz NOT NULL,
  expected_return_datetime timestamptz NOT NULL,
  notes text,
  status public.assignment_status NOT NULL DEFAULT 'assigned',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transport_assignments TO authenticated;
GRANT ALL ON public.transport_assignments TO service_role;
ALTER TABLE public.transport_assignments ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_assignments_updated BEFORE UPDATE ON public.transport_assignments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- DOUBLE BOOKING PREVENTION
CREATE OR REPLACE FUNCTION public.prevent_double_booking()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
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
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_assignment_conflict BEFORE INSERT OR UPDATE ON public.transport_assignments
FOR EACH ROW EXECUTE FUNCTION public.prevent_double_booking();

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL DEFAULT '',
  type public.notification_type NOT NULL DEFAULT 'system',
  related_request_id uuid REFERENCES public.transport_requests(id) ON DELETE CASCADE,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- AUDIT LOGS
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- SYSTEM SETTINGS
CREATE TABLE public.system_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_settings TO authenticated;
GRANT ALL ON public.system_settings TO service_role;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_settings_updated BEFORE UPDATE ON public.system_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- POLICIES
CREATE POLICY "departments readable" ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "departments admin manage" ON public.departments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "profiles self read" ON public.profiles FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid()) WITH CHECK (auth_user_id = auth.uid());
CREATE POLICY "profiles admin manage" ON public.profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "roles self read" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "roles admin manage" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "vehicles readable" ON public.vehicles FOR SELECT TO authenticated USING (true);
CREATE POLICY "vehicles staff manage" ON public.vehicles FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "drivers readable" ON public.drivers FOR SELECT TO authenticated USING (true);
CREATE POLICY "drivers staff manage" ON public.drivers FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "requests read own dept or staff" ON public.transport_requests FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()) OR requesting_department_id = public.current_department_id());
CREATE POLICY "requests create own dept" ON public.transport_requests FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()) OR (requesting_department_id = public.current_department_id() AND requester_id = public.current_profile_id()));
CREATE POLICY "requests update staff" ON public.transport_requests FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "requests update own" ON public.transport_requests FOR UPDATE TO authenticated
  USING (requester_id = public.current_profile_id() AND status IN ('draft','submitted','under_review','approved'))
  WITH CHECK (requester_id = public.current_profile_id());
CREATE POLICY "requests admin delete" ON public.transport_requests FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "days read" ON public.transport_request_days FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.transport_requests r WHERE r.id = transport_request_id
    AND (public.is_staff(auth.uid()) OR r.requesting_department_id = public.current_department_id())));
CREATE POLICY "days insert" ON public.transport_request_days FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.transport_requests r WHERE r.id = transport_request_id
    AND (public.is_staff(auth.uid()) OR r.requesting_department_id = public.current_department_id())));
CREATE POLICY "days staff manage" ON public.transport_request_days FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "assignments read" ON public.transport_assignments FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()) OR EXISTS (SELECT 1 FROM public.transport_requests r
    WHERE r.id = transport_request_id AND r.requesting_department_id = public.current_department_id()));
CREATE POLICY "assignments staff manage" ON public.transport_assignments FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "notifications own" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notifications own update" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "notifications insert" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "notifications own delete" ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "audit insert" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "audit staff read" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE POLICY "settings readable" ON public.system_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "settings admin manage" ON public.system_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- DEMO DATA
INSERT INTO public.departments (name, code, contact_name, contact_phone) VALUES
 ('Finance','FIN','Demo Contact','+251-900-000-001'),
 ('Human Resources','HR','Demo Contact','+251-900-000-002'),
 ('IT','IT','Demo Contact','+251-900-000-003'),
 ('Operations','OPS','Demo Contact','+251-900-000-004'),
 ('Credit','CRD','Demo Contact','+251-900-000-005'),
 ('Administration','ADM','Demo Contact','+251-900-000-006'),
 ('Risk','RSK','Demo Contact','+251-900-000-007'),
 ('Internal Audit','IAU','Demo Contact','+251-900-000-008'),
 ('Other','OTH','Demo Contact','+251-900-000-009');

INSERT INTO public.drivers (full_name, phone, license_number, status) VALUES
 ('Demo Driver One','+251-911-000-001','LIC-1001','available'),
 ('Demo Driver Two','+251-911-000-002','LIC-1002','available'),
 ('Demo Driver Three','+251-911-000-003','LIC-1003','available'),
 ('Demo Driver Four','+251-911-000-004','LIC-1004','available'),
 ('Demo Driver Five','+251-911-000-005','LIC-1005','available'),
 ('Demo Driver Six','+251-911-000-006','LIC-1006','available'),
 ('Demo Driver Seven','+251-911-000-007','LIC-1007','available'),
 ('Demo Driver Eight','+251-911-000-008','LIC-1008','leave'),
 ('Demo Driver Nine','+251-911-000-009','LIC-1009','available');

INSERT INTO public.vehicles (plate_number, vehicle_type, model, passenger_capacity, current_status) VALUES
 ('AA-12345','SUV','Toyota Land Cruiser',7,'available'),
 ('AA-23456','Minibus','Toyota Hiace',12,'available'),
 ('AA-34567','Pickup','Toyota Hilux',4,'available'),
 ('AA-45678','Sedan','Toyota Corolla',4,'available'),
 ('AA-56789','SUV','Nissan Patrol',7,'maintenance'),
 ('AA-67890','Minibus','Nissan Urvan',14,'available'),
 ('AA-78901','Pickup','Isuzu D-Max',4,'available'),
 ('AA-89012','Sedan','Hyundai Elantra',4,'available'),
 ('AA-90123','SUV','Mitsubishi Pajero',7,'unavailable');

UPDATE public.vehicles v SET assigned_driver_id = d.id
FROM (SELECT id, row_number() OVER (ORDER BY license_number) rn FROM public.drivers) d
WHERE d.rn = (SELECT row_number() OVER (ORDER BY plate_number) FROM public.vehicles v2 WHERE v2.id = v.id);

UPDATE public.drivers d SET assigned_vehicle_id = v.id FROM public.vehicles v WHERE v.assigned_driver_id = d.id;

INSERT INTO public.system_settings (key, value, description) VALUES
 ('daily_notice_hours','24','Minimum notice in hours for daily transport requests'),
 ('weekly_notice_days','3','Minimum notice in days for weekly transport requests'),
 ('max_passenger_capacity','14','Maximum passengers allowed on a single request'),
 ('organization_name','VisionFund (Demo)','Organisation name shown across the system'),
 ('notifications_enabled','true','Enable in-app notifications');

-- DEMO REQUESTS (no requester profile yet; visible to logistics/admin and matching departments)
INSERT INTO public.transport_requests (request_type, requesting_department_id, contact_number, request_date, trip_from_date, trip_to_date, number_of_passengers, destination, preferred_departure_time, estimated_return_time, purpose, goods_carried, status)
SELECT 'daily', d.id, '+251-900-000-001', current_date - 2, current_date + 1, current_date + 1, 4, 'Adama', '08:00', '17:00', 'Branch monitoring visit (demo)', 'Office documents', 'submitted' FROM public.departments d WHERE d.code='FIN';
INSERT INTO public.transport_requests (request_type, requesting_department_id, contact_number, request_date, trip_from_date, trip_to_date, number_of_passengers, destination, preferred_departure_time, estimated_return_time, purpose, status)
SELECT 'weekly', d.id, '+251-900-000-003', current_date - 3, current_date + 4, current_date + 9, 3, 'Dire Dawa', '07:30', '18:00', 'IT systems rollout (demo)', 'under_review' FROM public.departments d WHERE d.code='IT';
INSERT INTO public.transport_requests (request_type, requesting_department_id, contact_number, request_date, trip_from_date, trip_to_date, number_of_passengers, destination, preferred_departure_time, estimated_return_time, purpose, status, reviewed_at)
SELECT 'daily', d.id, '+251-900-000-002', current_date - 5, current_date + 2, current_date + 2, 6, 'Bishoftu', '09:00', '16:00', 'Staff training (demo)', 'approved', now() FROM public.departments d WHERE d.code='HR';
INSERT INTO public.transport_requests (request_type, requesting_department_id, contact_number, request_date, trip_from_date, trip_to_date, number_of_passengers, destination, preferred_departure_time, estimated_return_time, purpose, status, reviewed_at, rejection_reason)
SELECT 'daily', d.id, '+251-900-000-005', current_date - 6, current_date - 1, current_date - 1, 2, 'Hawassa', '08:00', '19:00', 'Client visit (demo)', 'rejected', now(), 'Submitted less than 24 hours before the trip.' FROM public.departments d WHERE d.code='CRD';
INSERT INTO public.transport_requests (request_type, requesting_department_id, contact_number, request_date, trip_from_date, trip_to_date, number_of_passengers, destination, preferred_departure_time, estimated_return_time, purpose, status, reviewed_at, completed_at)
SELECT 'daily', d.id, '+251-900-000-004', current_date - 12, current_date - 8, current_date - 8, 5, 'Debre Birhan', '07:00', '18:30', 'Field operations review (demo)', 'completed', now(), now() FROM public.departments d WHERE d.code='OPS';

INSERT INTO public.transport_request_days (transport_request_id, trip_date, morning_requested, afternoon_requested, departure_time, return_time, destination, number_of_passengers, purpose)
SELECT r.id, r.trip_from_date + g, true, (g % 2 = 1), '07:30', '18:00', 'Dire Dawa', 3, 'IT systems rollout (demo)'
FROM public.transport_requests r CROSS JOIN generate_series(0,4) g
WHERE r.request_type = 'weekly';

INSERT INTO public.transport_assignments (transport_request_id, vehicle_id, driver_id, departure_datetime, expected_return_datetime, status, notes)
SELECT r.id, v.id, v.assigned_driver_id,
  (r.trip_from_date + time '09:00') AT TIME ZONE 'UTC',
  (r.trip_from_date + time '16:00') AT TIME ZONE 'UTC',
  'assigned', 'Demo assignment'
FROM public.transport_requests r
JOIN public.vehicles v ON v.plate_number = 'AA-23456'
WHERE r.status = 'approved';

UPDATE public.transport_requests SET status = 'assigned'
WHERE id IN (SELECT transport_request_id FROM public.transport_assignments);