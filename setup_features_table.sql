-- سكريبت تجهيز جدول مميزات الشركة (Company Features) وإدخال البيانات الأساسية

CREATE TABLE IF NOT EXISTS company_features (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  icon TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  theme_color TEXT DEFAULT 'blue',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- التأكد من وجود الأعمدة في حال تم إنشاؤه مسبقاً بشكل خاطئ
ALTER TABLE company_features ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE company_features ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE company_features ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE company_features ADD COLUMN IF NOT EXISTS theme_color TEXT;

-- مسح أي بيانات سابقة من هذا الجدول إن وجدت لإدخال الهيكلية الجديدة نظيفة
TRUNCATE TABLE company_features;

-- إدخال بيانات الميزات الحالية الموجودة في صفحة (عن الشركة)
INSERT INTO company_features (icon, title, description, theme_color) VALUES
('🎯', 'دقة وجودة معتمدة', 'جميع منتجاتنا حاصلة على شهادات CE، ISO 9001، وOHSAS 18001 من موردين عالميين موثوقين', 'blue'),
('🔧', 'دعم فني متخصص', 'فريق مهندسين خبراء في السلامة المهنية والبيئة لتقديم الاستشارة والدعم قبل وبعد البيع', 'orange'),
('🏭', 'خبرة صناعية متعمقة', '15+ سنة في خدمة المصانع والشركات الصناعية والنفطية والإنشائية بأعلى معايير السلامة', 'green'),
('⚡', 'استجابة سريعة', 'نستجيب لعروض الأسعار خلال 4 ساعات عمل، ونوفر التوصيل السريع في أوقات الطوارئ', 'purple');

-- تفعيل الأمان (RLS)
ALTER TABLE company_features ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to company_features" ON company_features;
CREATE POLICY "Allow public read access to company_features" ON company_features FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert access to company_features" ON company_features;
CREATE POLICY "Allow public insert access to company_features" ON company_features FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update access to company_features" ON company_features;
CREATE POLICY "Allow public update access to company_features" ON company_features FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete access to company_features" ON company_features;
CREATE POLICY "Allow public delete access to company_features" ON company_features FOR DELETE USING (true);
