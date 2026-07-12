-- سكريبت تحديث جدول المنتجات لدعم الصور والفيديوهات والوصف

-- إضافة الأعمدة الناقصة لجدول المنتجات
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS images TEXT[],
ADD COLUMN IF NOT EXISTS videos TEXT[];

-- ملاحظة: لن يتم حذف أي بيانات سابقة من جدول المنتجات، سيتم فقط إضافة هذه الحقول وتكون فارغة مبدئياً.
-- بمجرد تنفيذ هذا السكريبت، يمكنك استخدام لوحة التحكم لرفع الصور والفيديوهات والوصف لكل منتج.
