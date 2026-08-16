-- 1. Departments: remove anonymous public read access
DROP POLICY IF EXISTS "departments public list" ON public.departments;
REVOKE SELECT ON public.departments FROM anon;

-- 2. Notifications: only staff may create notifications for other users
DROP POLICY IF EXISTS "notifications insert" ON public.notifications;
CREATE POLICY "notifications staff insert" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

-- 3. Audit logs: no direct client inserts (triggers write them)
DROP POLICY IF EXISTS "audit insert" ON public.audit_logs;
REVOKE INSERT ON public.audit_logs FROM authenticated;

-- 4. Lock down SECURITY DEFINER functions that clients must not call directly
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_staff(text, text, public.notification_type, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.request_notifications() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.write_audit_log() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_double_booking() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.current_department_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_profile_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;