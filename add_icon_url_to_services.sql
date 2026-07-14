-- إضافة حقل لصورة الأيقونة لجدول الخدمات
ALTER TABLE services ADD COLUMN IF NOT EXISTS icon_url TEXT;
