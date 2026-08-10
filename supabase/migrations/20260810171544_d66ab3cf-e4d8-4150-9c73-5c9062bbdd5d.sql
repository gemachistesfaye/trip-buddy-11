REVOKE EXECUTE ON FUNCTION public.request_notifications() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.write_audit_log() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.prevent_double_booking() FROM anon, authenticated, public;