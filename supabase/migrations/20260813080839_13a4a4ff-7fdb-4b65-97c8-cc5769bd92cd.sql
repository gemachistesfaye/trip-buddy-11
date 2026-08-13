GRANT SELECT ON public.departments TO anon;
CREATE POLICY "departments public list" ON public.departments FOR SELECT TO anon USING (is_active);