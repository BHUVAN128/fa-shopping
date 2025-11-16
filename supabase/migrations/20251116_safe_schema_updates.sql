-- Safe schema updates for Supabase/Postgres
-- This file uses conditional checks to avoid unsupported syntax like
-- ALTER TABLE ... RENAME COLUMN IF EXISTS

-- 1) Rename sales.date -> sales.created_at only if 'date' column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='sales' AND column_name='date'
  ) THEN
    ALTER TABLE public.sales RENAME COLUMN "date" TO created_at;
  END IF;
END$$;

-- 2) Ensure sales.created_at exists and has a default
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- 3) Ensure sale_items.created_at exists
ALTER TABLE public.sale_items
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- 4) Ensure low_stock_threshold exists on products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 3;

-- 5) Create stock_logs if missing
CREATE TABLE IF NOT EXISTS public.stock_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('add','remove','sale')),
  change INTEGER NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6) Create orders & order_items if missing
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  total NUMERIC NOT NULL,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  qty INTEGER NOT NULL,
  price NUMERIC NOT NULL
);

-- 7) Ensure RLS enabled for new tables (no-op if already enabled)
ALTER TABLE IF EXISTS public.stock_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.order_items ENABLE ROW LEVEL SECURITY;

-- 8) Create policies for authenticated users (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'enable_all_for_authenticated_stock_logs'
  ) THEN
    CREATE POLICY enable_all_for_authenticated_stock_logs ON public.stock_logs FOR ALL USING (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'enable_all_for_authenticated_orders'
  ) THEN
    CREATE POLICY enable_all_for_authenticated_orders ON public.orders FOR ALL USING (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'enable_all_for_authenticated_order_items'
  ) THEN
    CREATE POLICY enable_all_for_authenticated_order_items ON public.order_items FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END$$;

-- 9) Create/replace views using created_at
DROP VIEW IF EXISTS public.daily_sales_summary;
CREATE VIEW public.daily_sales_summary AS
SELECT
  DATE(s.created_at) AS date,
  SUM(s.total) AS total_sales,
  COUNT(DISTINCT s.id) AS orders_count
FROM public.sales s
GROUP BY DATE(s.created_at)
ORDER BY date DESC;

DROP VIEW IF EXISTS public.monthly_sales_summary;
CREATE VIEW public.monthly_sales_summary AS
SELECT
  TO_CHAR(s.created_at, 'YYYY-MM') AS month,
  SUM(s.total) AS total_sales,
  COUNT(DISTINCT s.id) AS orders_count
FROM public.sales s
GROUP BY TO_CHAR(s.created_at, 'YYYY-MM')
ORDER BY month DESC;
