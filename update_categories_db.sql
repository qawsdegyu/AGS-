-- سكريبت تحديث أقسام المنتجات في قاعدة البيانات

-- هذا السكريبت سيقوم بتحويل المنتجات ذات الأقسام القديمة إلى الأقسام الجديدة

-- تحديث الفحص والقياس
UPDATE products SET category = 'measurement' WHERE category IN ('gas', 'noise', 'light', 'air', 'thermal', 'measurement');

-- تحديث أدوات السلامة
UPDATE products SET category = 'safety' WHERE category IN ('ppe', 'safety');

-- تحديث أنظمة الإنذار
UPDATE products SET category = 'alarm' WHERE category IN ('alarm');

-- تحديث أنظمة الحريق
UPDATE products SET category = 'fire_other' WHERE category IN ('fire');

-- ملاحظة: الأقسام attendance و monitoring جديدة ولم تكن موجودة سابقاً كأقسام افتراضية في السكيما القديمة.
-- إذا كان هناك منتجات مسجلة بأسماء أخرى تخص الدوام أو المراقبة، يرجى تحديثها يدوياً أو تعديل السكريبت لتضمينها.
