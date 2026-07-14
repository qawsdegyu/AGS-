-- إنشاء جدول page_views لتتبع الزوار
CREATE TABLE IF NOT EXISTS public.page_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  page_url TEXT NOT NULL,
  product_id TEXT,
  source TEXT,
  session_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- إعطاء الصلاحيات للجدول الجديد
GRANT ALL ON TABLE public.page_views TO anon;
GRANT ALL ON TABLE public.page_views TO authenticated;
GRANT ALL ON TABLE public.page_views TO service_role;

-- السماح بالوصول المجهول (Anonymous) لإضافة صفوف جديدة
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous inserts to page_views" 
ON public.page_views FOR INSERT 
TO anon 
WITH CHECK (true);

-- السماح بالوصول الكامل للإدارة
CREATE POLICY "Allow read for all" 
ON public.page_views FOR SELECT 
TO public 
USING (true);
