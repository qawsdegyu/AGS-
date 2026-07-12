-- ========================================================
-- إضافات قاعدة بيانات AGS (الجزء الثاني)
-- الجداول: categories, customers, inspections
-- ========================================================

-- 1. جدول الفئات (Categories)
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  color_code TEXT DEFAULT '#1565C0',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- إدخال بعض الفئات الافتراضية
INSERT INTO categories (name, color_code)
VALUES 
  ('أجهزة قياس', '#1565C0'),
  ('معدات سلامة', '#E65100'),
  ('كاشفات غاز', '#F44336'),
  ('معدات تنفس', '#00C853')
ON CONFLICT (name) DO NOTHING;

-- 2. جدول العملاء (Customers)
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. جدول المواعيد والفحص البيئي (Inspections)
CREATE TABLE IF NOT EXISTS inspections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name TEXT NOT NULL,
  company_name TEXT,
  phone TEXT NOT NULL,
  inspection_date DATE NOT NULL,
  inspection_type TEXT NOT NULL,
  status TEXT DEFAULT 'قيد المراجعة', -- قيد المراجعة، مؤكد، مكتمل، ملغى
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================================
-- تفعيل سياسات الأمان (RLS - Row Level Security)
-- ========================================================

-- الفئات
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read categories" ON categories;
DROP POLICY IF EXISTS "Admin full access categories" ON categories;
CREATE POLICY "Public read categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Admin full access categories" ON categories FOR ALL USING (
  EXISTS (SELECT 1 FROM admin_users WHERE admin_users.email = auth.jwt() ->> 'email')
) WITH CHECK (
  EXISTS (SELECT 1 FROM admin_users WHERE admin_users.email = auth.jwt() ->> 'email')
);

-- العملاء
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin full access customers" ON customers;
CREATE POLICY "Admin full access customers" ON customers FOR ALL USING (
  EXISTS (SELECT 1 FROM admin_users WHERE admin_users.email = auth.jwt() ->> 'email')
) WITH CHECK (
  EXISTS (SELECT 1 FROM admin_users WHERE admin_users.email = auth.jwt() ->> 'email')
);

-- المواعيد
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public insert inspections" ON inspections;
DROP POLICY IF EXISTS "Admin full access inspections" ON inspections;
DROP POLICY IF EXISTS "Public read inspections" ON inspections;
DROP POLICY IF EXISTS "Public update inspections" ON inspections;
CREATE POLICY "Public insert inspections" ON inspections FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read inspections" ON inspections FOR SELECT USING (true);
CREATE POLICY "Public update inspections" ON inspections FOR UPDATE USING (true);
CREATE POLICY "Admin full access inspections" ON inspections FOR ALL USING (
  EXISTS (SELECT 1 FROM admin_users WHERE admin_users.email = auth.jwt() ->> 'email')
) WITH CHECK (
  EXISTS (SELECT 1 FROM admin_users WHERE admin_users.email = auth.jwt() ->> 'email')
);

-- ========================================================
-- جدول مستخدمي الإدارة (Admin Users)
-- ========================================================
CREATE TABLE IF NOT EXISTS public.admin_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read access to admin_users" ON public.admin_users;
CREATE POLICY "Allow read access to admin_users" ON public.admin_users FOR SELECT USING (true);
-- أضف إيميل الأدمن الخاص بك هنا
-- INSERT INTO public.admin_users (email) VALUES ('admin@example.com');

-- ========================================================
-- جدول المنتجات (Products) - إضافة الأعمدة الجديدة للوسائط المتعددة
-- ========================================================
-- Execute these in Supabase SQL editor to add media support:
-- ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;
-- ALTER TABLE products ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';
-- ALTER TABLE products ADD COLUMN IF NOT EXISTS videos TEXT[] DEFAULT '{}';

-- ========================================================
-- إعداد مساحة التخزين (Storage Bucket) للملفات والصور
-- ========================================================
-- 1. إنشاء Bucket جديد باسم product-media
insert into storage.buckets (id, name, public)
values ('product-media', 'product-media', true)
on conflict (id) do nothing;

-- 2. السماح للجميع بقراءة الملفات (لأنها صور منتجات يجب أن تظهر للجميع)
DROP POLICY IF EXISTS "Public Access to product-media" ON storage.objects;
create policy "Public Access to product-media"
on storage.objects for select
using ( bucket_id = 'product-media' );

-- 3. السماح لأي شخص برفع الملفات (مؤقتاً لتسهيل العملية)
DROP POLICY IF EXISTS "Public Upload to product-media" ON storage.objects;
create policy "Public Upload to product-media"
on storage.objects for insert
with check ( bucket_id = 'product-media' );

-- ========================================================
-- جدول الخدمات (Services)
-- ========================================================
CREATE TABLE IF NOT EXISTS public.services (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  title_en text,
  description text,
  features text[] default '{}',
  price_starts_at numeric,
  theme_color text default 'yellow',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- إعداد الصلاحيات لجدول الخدمات
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to services" ON public.services;
CREATE POLICY "Allow public read access to services" ON public.services FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert to services" ON public.services;
CREATE POLICY "Allow insert to services" ON public.services FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update to services" ON public.services;
CREATE POLICY "Allow update to services" ON public.services FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow delete to services" ON public.services;
CREATE POLICY "Allow delete to services" ON public.services FOR DELETE USING (true);

-- ========================================================
-- جدول طلبات عروض الأسعار (RFQs)
-- ========================================================
CREATE TABLE IF NOT EXISTS public.rfqs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_name TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  details TEXT NOT NULL,
  status TEXT DEFAULT 'انتظار' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.rfqs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert access to rfqs" ON public.rfqs;
CREATE POLICY "Allow public insert access to rfqs" ON public.rfqs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read access to rfqs" ON public.rfqs;
CREATE POLICY "Allow public read access to rfqs" ON public.rfqs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public update access to rfqs" ON public.rfqs;
CREATE POLICY "Allow public update access to rfqs" ON public.rfqs FOR UPDATE USING (true);

-- ========================================================
-- جدول الإعلانات (Announcements)
-- ========================================================
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT NOT NULL,
  link_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.announcements;
CREATE POLICY "Enable read access for all users" ON public.announcements FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert to announcements" ON public.announcements;
CREATE POLICY "Allow insert to announcements" ON public.announcements FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update to announcements" ON public.announcements;
CREATE POLICY "Allow update to announcements" ON public.announcements FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow delete to announcements" ON public.announcements;
CREATE POLICY "Allow delete to announcements" ON public.announcements FOR DELETE USING (true);

-- Insert dummy data (Optional)
-- INSERT INTO public.announcements (title, description, image_url, link_url, is_active)
-- VALUES (
--     'أحدث أجهزة الفحص والقياس متوفرة الآن!',
--     'اكتشف مجموعتنا الجديدة من أجهزة القياس الدقيقة لتطبيقات السلامة الصناعية والمختبرات. مصممة لتلبية أعلى معايير الجودة العالمية.',
--     'https://images.unsplash.com/photo-1581092160562-40aa08e78837?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
--     'products.html',
--     true
-- );
