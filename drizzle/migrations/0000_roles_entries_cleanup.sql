CREATE TYPE public.app_role AS ENUM ('admin', 'tecnico');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sector text NOT NULL,
  UNIQUE (user_id, sector)
);
GRANT SELECT ON public.user_permissions TO authenticated;
GRANT ALL ON public.user_permissions TO service_role;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.staff_accounts (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  role_label text NOT NULL DEFAULT 'Técnico de Registo',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.staff_accounts TO authenticated;
GRANT ALL ON public.staff_accounts TO service_role;
ALTER TABLE public.staff_accounts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.can_access(_user_id uuid, _sector text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'admin') OR EXISTS (
    SELECT 1 FROM public.user_permissions p
    JOIN public.staff_accounts s ON s.user_id = p.user_id AND s.active
    WHERE p.user_id = _user_id AND p.sector = _sector)
$$;

CREATE POLICY "Own or admin roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Own or admin perms" ON public.user_permissions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Own or admin staff" ON public.staff_accounts FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.sector_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sector text NOT NULL,
  amount integer NOT NULL CHECK (amount >= 0),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sector_entries TO authenticated;
GRANT ALL ON public.sector_entries TO service_role;
ALTER TABLE public.sector_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sector access entries" ON public.sector_entries FOR ALL TO authenticated
  USING (public.can_access(auth.uid(), sector)) WITH CHECK (public.can_access(auth.uid(), sector));

-- Tighten expenses: admin or sector permission with cost-center access
DROP POLICY IF EXISTS "Authenticated can manage expenses" ON public.expenses;
CREATE POLICY "Sector access expenses" ON public.expenses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR (public.can_access(auth.uid(), 'custos') AND public.can_access(auth.uid(), sector)))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR (public.can_access(auth.uid(), 'custos') AND public.can_access(auth.uid(), sector)));

DROP POLICY IF EXISTS "Authenticated can manage water products" ON public.water_products;
CREATE POLICY "Water access products" ON public.water_products FOR ALL TO authenticated
  USING (public.can_access(auth.uid(), 'agua')) WITH CHECK (public.can_access(auth.uid(), 'agua'));
DROP POLICY IF EXISTS "Authenticated can manage water sales" ON public.water_sales;
CREATE POLICY "Water access sales" ON public.water_sales FOR ALL TO authenticated
  USING (public.can_access(auth.uid(), 'agua')) WITH CHECK (public.can_access(auth.uid(), 'agua'));

-- Single admin
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE email = 'josebuco923@gmail.com'
ON CONFLICT DO NOTHING;

-- Clean test data
DELETE FROM public.water_sales WHERE true;
DELETE FROM public.restaurant_orders WHERE true;
DELETE FROM public.wash_queue WHERE true;
DELETE FROM public.school_routes WHERE true;
DELETE FROM public.school_contracts WHERE true;
DELETE FROM public.expenses WHERE true;
DELETE FROM public.activity_logs WHERE true;
UPDATE public.water_products SET stock = 0;