-- سكريبت تجهيز جدول شريط المميزات للصفحة الرئيسية
CREATE TABLE IF NOT EXISTS home_features_strip (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  icon TEXT NOT NULL,
  theme_color_hex TEXT DEFAULT '#1565C0',
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- التأكد من وجود الأعمدة
ALTER TABLE home_features_strip ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE home_features_strip ADD COLUMN IF NOT EXISTS subtitle TEXT;
ALTER TABLE home_features_strip ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE home_features_strip ADD COLUMN IF NOT EXISTS theme_color_hex TEXT;
ALTER TABLE home_features_strip ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- مسح أي بيانات سابقة
TRUNCATE TABLE home_features_strip;

-- إدخال البيانات الافتراضية كما هي في الصفحة الرئيسية
INSERT INTO home_features_strip (display_order, title, subtitle, theme_color_hex, icon) VALUES
(1, 'شهادات مطابقة معتمدة', 'CE, ISO 9001, OHSAS', '#1565C0', '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></svg>'),
(2, 'توصيل سريع لكل مكان', 'خلال 48-72 ساعة داخل المملكة', '#FF6B00', '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>'),
(3, 'ضمان 2 سنة', 'على جميع المنتجات', '#00C853', '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>'),
(4, 'شحن مجاني', 'للطلبات فوق 100 دينار', '#1565C0', '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>');

-- تفعيل الأمان (RLS)
ALTER TABLE home_features_strip ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to home_features_strip" ON home_features_strip;
CREATE POLICY "Allow public read access to home_features_strip" ON home_features_strip FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow admin all access to home_features_strip" ON home_features_strip;
CREATE POLICY "Allow admin all access to home_features_strip" ON home_features_strip FOR ALL USING (true);
