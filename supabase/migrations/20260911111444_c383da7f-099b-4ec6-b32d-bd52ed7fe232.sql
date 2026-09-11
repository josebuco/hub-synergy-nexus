CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.sectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT 'primary',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sectors TO authenticated;
GRANT ALL ON public.sectors TO service_role;
ALTER TABLE public.sectors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage sectors" ON public.sectors FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.water_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'unidade',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.water_products TO authenticated;
GRANT ALL ON public.water_products TO service_role;
ALTER TABLE public.water_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage water products" ON public.water_products FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.water_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.water_products(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price INTEGER NOT NULL,
  total INTEGER NOT NULL,
  client_name TEXT,
  status TEXT NOT NULL DEFAULT 'Entregue',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.water_sales TO authenticated;
GRANT ALL ON public.water_sales TO service_role;
ALTER TABLE public.water_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage water sales" ON public.water_sales FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.restaurant_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number INTEGER NOT NULL UNIQUE,
  capacity INTEGER NOT NULL DEFAULT 2,
  status TEXT NOT NULL DEFAULT 'Livre',
  current_order_value INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_tables TO authenticated;
GRANT ALL ON public.restaurant_tables TO service_role;
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage restaurant tables" ON public.restaurant_tables FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.restaurant_menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_menu_items TO authenticated;
GRANT ALL ON public.restaurant_menu_items TO service_role;
ALTER TABLE public.restaurant_menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage menu items" ON public.restaurant_menu_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.restaurant_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID REFERENCES public.restaurant_tables(id),
  status TEXT NOT NULL DEFAULT 'Em curso',
  total INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_orders TO authenticated;
GRANT ALL ON public.restaurant_orders TO service_role;
ALTER TABLE public.restaurant_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage restaurant orders" ON public.restaurant_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.wash_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wash_services TO authenticated;
GRANT ALL ON public.wash_services TO service_role;
ALTER TABLE public.wash_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage wash services" ON public.wash_services FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.wash_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_description TEXT NOT NULL,
  service_id UUID REFERENCES public.wash_services(id),
  status TEXT NOT NULL DEFAULT 'Em espera',
  total INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wash_queue TO authenticated;
GRANT ALL ON public.wash_queue TO service_role;
ALTER TABLE public.wash_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage wash queue" ON public.wash_queue FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.school_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name TEXT NOT NULL,
  route_code TEXT NOT NULL,
  student_count INTEGER NOT NULL DEFAULT 0,
  monthly_fee INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'Activo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_contracts TO authenticated;
GRANT ALL ON public.school_contracts TO service_role;
ALTER TABLE public.school_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage school contracts" ON public.school_contracts FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.school_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_code TEXT NOT NULL UNIQUE,
  driver_name TEXT NOT NULL,
  vehicle TEXT NOT NULL,
  student_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Em curso',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_routes TO authenticated;
GRANT ALL ON public.school_routes TO service_role;
ALTER TABLE public.school_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage school routes" ON public.school_routes FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  sector TEXT NOT NULL,
  amount INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage activity logs" ON public.activity_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed data
INSERT INTO public.sectors (name, slug, color, sort_order) VALUES
  ('Painel geral', 'dashboard', 'primary', 0),
  ('Água', 'agua', 'water', 1),
  ('Restaurante', 'restaurante', 'restaurant', 2),
  ('Lavagem', 'lavagem', 'wash', 3),
  ('Transporte Escolar', 'transporte', 'transport', 4);

INSERT INTO public.water_products (name, price, stock, unit) VALUES
  ('Fardo 12 × 500ml', 1800, 120, 'fardo'),
  ('Galão 20L', 2200, 45, 'galão'),
  ('Garrafa 1,5L', 350, 230, 'garrafa'),
  ('Água a granel / litro', 120, 1000, 'litro');

INSERT INTO public.water_sales (product_id, quantity, unit_price, total, client_name, status, created_at)
SELECT id, 5, price, 5 * price, 'Bairro do Kilamba', 'Entregue', now() - interval '8 minutes'
FROM public.water_products WHERE name = 'Galão 20L';

INSERT INTO public.water_sales (product_id, quantity, unit_price, total, client_name, status, created_at)
SELECT id, 10, price, 10 * price, 'Restaurante Central', 'Pago', now() - interval '2 hours'
FROM public.water_products WHERE name = 'Fardo 12 × 500ml';

INSERT INTO public.water_sales (product_id, quantity, unit_price, total, client_name, status, created_at)
SELECT id, 24, price, 24 * price, 'Escola S. Luiz', 'Pendente', now() - interval '1 day'
FROM public.water_products WHERE name = 'Garrafa 1,5L';

INSERT INTO public.restaurant_tables (number, capacity, status, current_order_value) VALUES
  (1, 4, 'Ocupada', 48000),
  (2, 2, 'Livre', 0),
  (3, 6, 'Reservada', 0),
  (4, 4, 'Ocupada', 32000),
  (5, 8, 'Ocupada', 96000),
  (6, 2, 'Livre', 0);

INSERT INTO public.restaurant_menu_items (name, price) VALUES
  ('Muamba de galinha', 8500),
  ('Arroz de marisco', 12000),
  ('Feijão de óleo de palma', 6500),
  ('Grelhado misto', 15000);

INSERT INTO public.restaurant_orders (table_id, status, total, created_at)
SELECT id, 'Pago', 48000, now() - interval '22 minutes'
FROM public.restaurant_tables WHERE number = 1;

INSERT INTO public.wash_services (name, price) VALUES
  ('Lavagem exterior', 10000),
  ('Lavagem completa', 15000),
  ('Exterior + cera', 25000),
  ('Polimento interior', 18000);

INSERT INTO public.wash_queue (car_description, service_id, status, total, created_at)
SELECT 'Toyota Hilux branca', id, 'Em curso', price, now() - interval '41 minutes'
FROM public.wash_services WHERE name = 'Lavagem completa';

INSERT INTO public.wash_queue (car_description, service_id, status, total, created_at)
SELECT 'Hyundai Tucson cinza', id, 'Em espera', price, now() - interval '15 minutes'
FROM public.wash_services WHERE name = 'Exterior + cera';

INSERT INTO public.wash_queue (car_description, service_id, status, total, created_at)
SELECT 'Mazda 6 preta', id, 'Em espera', price, now() - interval '5 minutes'
FROM public.wash_services WHERE name = 'Polimento interior';

INSERT INTO public.school_contracts (school_name, route_code, student_count, monthly_fee, status) VALUES
  ('E.B. 14 de Fevereiro', 'R-03', 62, 3200000, 'Activo'),
  ('E.P. Samakuva', 'R-07', 48, 2400000, 'Activo'),
  ('E.B. do Cazenga', 'R-01', 71, 3550000, 'Pendente'),
  ('E.P. do Maianga', 'R-05', 39, 1950000, 'Aceite'),
  ('Colégio São Francisco', 'R-02', 55, 2750000, 'Activo');

INSERT INTO public.school_routes (route_code, driver_name, vehicle, student_count, status) VALUES
  ('R-03', 'Manuel P.', 'Toyota Coaster', 62, 'Em curso'),
  ('R-07', 'António K.', 'Hyundai H-1', 48, 'Concluída'),
  ('R-01', 'Domingos S.', 'Toyota Hiace', 71, 'Atrasada');

INSERT INTO public.activity_logs (action, sector, amount, metadata, created_at) VALUES
  ('Venda de galão', 'Água', 11000, '{"client":"Bairro do Kilamba"}', now() - interval '8 minutes'),
  ('Mesa 7 servida', 'Restaurante', 48000, '{"table":7}', now() - interval '22 minutes'),
  ('Lavagem exterior concluída', 'Lavagem', 15000, '{"car":"Toyota Hilux"}', now() - interval '41 minutes'),
  ('Rota 3 concluída', 'Transporte Escolar', 0, '{"school":"E.B. 14 de Fevereiro","students":62}', now() - interval '1 hour');
