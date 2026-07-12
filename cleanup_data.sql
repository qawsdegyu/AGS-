-- ========================================================
-- تنظيف البيانات التجريبية (Data Cleanup Script)
-- يرجى تشغيل هذا السكربت في محرر SQL في Supabase
-- ========================================================

-- 1. مسح المنتجات التي تحتوي على فئات تجريبية أو خاطئة (إذا لزم الأمر)
-- سيتم حذف المنتجات التجريبية التي كان الغرض منها فقط فحص العرض
DELETE FROM products WHERE title ILIKE '%test%' OR title ILIKE '%تجريب%';

-- تحديث أي فئات مسجلة كخدمات بالخطأ إلى فئة المنتجات الصحيحة
UPDATE products SET category = 'measurement' WHERE category IN ('noise', 'light', 'air', 'thermal');

-- 2. إعادة ضبط أسماء الفئات الأساسية في جدول categories
TRUNCATE TABLE categories CASCADE;

INSERT INTO categories (name, color_code) VALUES
('measurement', '#1565C0'),
('gas', '#FF6B00'),
('safety', '#F44336'),
('fire', '#00C853'),
('ppe', '#FFD600'),
('alarm', '#9C27B0');

-- ملاحظة: بعد تشغيل هذا الملف، سيتم تنظيف الفئات وتحديث المنتجات
