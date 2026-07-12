-- Create products table
CREATE TABLE products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  brand TEXT NOT NULL,
  category TEXT NOT NULL, -- e.g., 'measurement', 'safety', 'attendance', 'monitoring', 'alarm', 'fire_other', 'other'
  price NUMERIC, -- Can be null if it's RFQ only
  old_price NUMERIC,
  is_rfq BOOLEAN DEFAULT false,
  description TEXT, -- Detailed product description
  badges TEXT[], -- e.g., '{"جديد", "CE"}'
  specs TEXT[], -- e.g., '{"4 غازات", "IP68"}'
  images TEXT[], -- Array of image URLs
  videos TEXT[], -- Array of video URLs
  image_type TEXT NOT NULL, -- e.g., 'gas', 'noise', 'ppe', 'fire' to determine default icons/colors
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert sample data (based on your existing static HTML)
INSERT INTO products (title, brand, category, price, old_price, is_rfq, description, badges, specs, images, videos, image_type) VALUES
('جهاز كشف الغاز المتعدد BW™ Clip4 — O2, CO, H2S, EX', 'Honeywell', 'measurement', 285, 320, false, 'جهاز احترافي لكشف 4 غازات...', '{"جديد", "CE"}', '{"4 غازات", "IP68", "بدون صيانة"}', '{}', '{}', 'gas'),
('نظام مراقبة الغاز الثابت X-am 5100 — للمواقع الصناعية', 'Dräger', 'measurement', 1200, null, false, 'نظام متكامل للمراقبة المستمرة...', '{"صناعي"}', '{"ATEX", "IECEx", "مراقبة مستمرة"}', '{}', '{}', 'gas'),
('جهاز قياس مستوى الضوضاء testo 816-1 — Class 2', 'Testo', 'measurement', 450, null, false, 'مقياس ضوضاء دقيق جداً...', '{"الأكثر مبيعاً"}', '{"30-130 dB", "IEC 61672", "USB"}', '{}', '{}', 'noise'),
('جهاز قياس شدة الإضاءة Fluke 941 — للفحص المهني', 'Fluke', 'measurement', 220, null, false, 'مثالي لاختبار مستوى الإضاءة...', '{"CE"}', '{"0.1-400k Lux", "±5%", "بطارية 9V"}', '{}', '{}', 'light'),
('خوذة السلامة الصناعية 3M H-700 Series بتهوية هوائية', '3M', 'safety', 45, 55, false, 'خوذة مريحة جداً للمواقع...', '{"ANSI Z89.1"}', '{"Class E", "4 ألوان", "4 مقاسات"}', '{}', '{}', 'ppe'),
('نظارة السلامة 3M Virtua المضادة للضباب والخدش', '3M', 'safety', 18, 25, false, 'توفر حماية للعين بتصميم خفيف...', '{"خصم 20%"}', '{"مضادة للضباب", "عدسات بولي كربونات", "حماية UV"}', '{}', '{}', 'ppe'),
('كاشف دخان وحرارة ثنائي الاستشعار مع إنذار صوتي 85dB', 'Kidde', 'alarm', null, null, true, 'حساس دخان عالي الجودة...', '{"عرض خاص"}', '{"EN 14604", "بطارية 10 سنوات"}', '{}', '{}', 'fire'),
('طفاية حريق بودرة جافة 6 كجم معتمدة', 'Bavaria', 'fire_other', null, null, true, 'طفاية حريق قياسية...', '{"معتمد"}', '{"بودرة جافة", "6 كجم", "متعددة الأغراض"}', '{}', '{}', 'fire');

-- Set up Row Level Security (RLS)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Allow public read access to products
CREATE POLICY "Allow public read access" ON products FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON products FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON products FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON products FOR DELETE USING (true);

-- Create orders table
CREATE TABLE orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_company TEXT,
  customer_email TEXT,
  total_amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'معالجة' NOT NULL, -- e.g., 'معالجة', 'شحن', 'تسليم', 'ملغى'
  payment_status TEXT DEFAULT 'غير مدفوع',
  items JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public insert access to orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read access to orders" ON orders FOR SELECT USING (true);
CREATE POLICY "Allow public update access to orders" ON orders FOR UPDATE USING (true);

-- Create rfqs table
CREATE TABLE rfqs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_name TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  details TEXT NOT NULL,
  status TEXT DEFAULT 'انتظار' NOT NULL, -- e.g., 'انتظار', 'عرض أُرسل', 'مرفوض'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE rfqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public insert access to rfqs" ON rfqs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read access to rfqs" ON rfqs FOR SELECT USING (true);
CREATE POLICY "Allow public update access to rfqs" ON rfqs FOR UPDATE USING (true);
