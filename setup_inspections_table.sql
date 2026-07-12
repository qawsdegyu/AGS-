-- ?????? ????? ???? ?????? ????? (Inspections)

CREATE TABLE IF NOT EXISTS public.inspections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_name TEXT,
  customer_name TEXT,
  phone TEXT,
  inspection_date DATE,
  inspection_type TEXT,
  notes TEXT,
  status TEXT DEFAULT '??? ????????',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert to inspections" ON public.inspections;
CREATE POLICY "Allow public insert to inspections" ON public.inspections FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public select to inspections" ON public.inspections;
CREATE POLICY "Allow public select to inspections" ON public.inspections FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public update to inspections" ON public.inspections;
CREATE POLICY "Allow public update to inspections" ON public.inspections FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete to inspections" ON public.inspections;
CREATE POLICY "Allow public delete to inspections" ON public.inspections FOR DELETE USING (true);
