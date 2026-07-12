-- ========================================================
-- إضافات التجارة الإلكترونية والدفع (Ecommerce Extensions)
-- يرجى تشغيل هذا السكربت في محرر SQL في Supabase
-- ========================================================

-- 1. إضافة الحقول الجديدة لجدول الطلبات (إذا لم تكن موجودة)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='customer_phone') THEN
        ALTER TABLE orders ADD COLUMN customer_phone TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='delivery_city') THEN
        ALTER TABLE orders ADD COLUMN delivery_city TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='delivery_address') THEN
        ALTER TABLE orders ADD COLUMN delivery_address TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='delivery_fee') THEN
        ALTER TABLE orders ADD COLUMN delivery_fee NUMERIC DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='payment_method') THEN
        ALTER TABLE orders ADD COLUMN payment_method TEXT DEFAULT 'COD';
    END IF;
END $$;

-- 2. دالة لحساب التكلفة للفرونت إند (قبل إرسال الطلب)
DROP FUNCTION IF EXISTS calculate_checkout_total(jsonb, text);
CREATE OR REPLACE FUNCTION calculate_checkout_total(cart_items JSONB, city TEXT, user_email TEXT DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  calculated_total NUMERIC := 0;
  delivery_cost NUMERIC := 0;
  item_record JSONB;
  prod_price NUMERIC;
  order_count INT := 0;
  first_order_discount NUMERIC := 0;
  final_subtotal NUMERIC := 0;
BEGIN
  -- حساب رسوم التوصيل
  IF city = 'عمان' THEN
    delivery_cost := 2.00;
  ELSE
    delivery_cost := 3.00;
  END IF;

  -- حساب مجموع أسعار المنتجات الحقيقية من الداتا بيز
  FOR item_record IN SELECT * FROM jsonb_array_elements(cart_items)
  LOOP
    SELECT price * (1 - COALESCE(discount_percentage, 0) / 100) INTO prod_price FROM products WHERE id = COALESCE(item_record->>'productId', item_record->>'product_id')::uuid;
    IF prod_price IS NOT NULL THEN
      calculated_total := calculated_total + (prod_price * COALESCE((item_record->>'quantity')::int, 1));
    END IF;
  END LOOP;

  final_subtotal := calculated_total;

  -- تطبيق خصم الطلب الأول إذا لزم الأمر
  IF user_email IS NOT NULL AND user_email != '' THEN
    SELECT COUNT(*) INTO order_count FROM orders WHERE customer_email = user_email;
    IF order_count = 0 THEN
      SELECT value INTO first_order_discount FROM store_settings WHERE key = 'first_order_discount';
      IF first_order_discount IS NOT NULL AND first_order_discount > 0 THEN
        final_subtotal := calculated_total * (1 - (first_order_discount / 100));
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'subtotal', calculated_total,
    'discounted_subtotal', final_subtotal,
    'first_order_discount_percent', first_order_discount,
    'delivery_fee', delivery_cost,
    'total', final_subtotal + delivery_cost
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. تريجر (Trigger) أمني لمنع التلاعب بالأسعار عند حفظ الطلب
CREATE OR REPLACE FUNCTION secure_calculate_order_total()
RETURNS TRIGGER AS $$
DECLARE
  calculated_total NUMERIC := 0;
  delivery_cost NUMERIC := 0;
  item_record JSONB;
  prod_price NUMERIC;
  order_count INT := 0;
  first_order_discount NUMERIC := 0;
  final_subtotal NUMERIC := 0;
BEGIN
  -- حساب رسوم التوصيل
  IF NEW.delivery_city = 'عمان' THEN
    delivery_cost := 2.00;
  ELSE
    delivery_cost := 3.00;
  END IF;
  
  NEW.delivery_fee := delivery_cost;

  -- حساب الأسعار من قاعدة البيانات مباشرة
  FOR item_record IN SELECT * FROM jsonb_array_elements(NEW.items)
  LOOP
    SELECT price * (1 - COALESCE(discount_percentage, 0) / 100) INTO prod_price FROM products WHERE id = COALESCE(item_record->>'productId', item_record->>'product_id')::uuid;
    IF prod_price IS NOT NULL THEN
      calculated_total := calculated_total + (prod_price * COALESCE((item_record->>'quantity')::int, 1));
    END IF;
  END LOOP;

  final_subtotal := calculated_total;

  IF NEW.customer_email IS NOT NULL AND NEW.customer_email != '' THEN
    SELECT COUNT(*) INTO order_count FROM orders WHERE customer_email = NEW.customer_email AND id != NEW.id;
    IF order_count = 0 THEN
      SELECT value INTO first_order_discount FROM store_settings WHERE key = 'first_order_discount';
      IF first_order_discount IS NOT NULL AND first_order_discount > 0 THEN
        final_subtotal := calculated_total * (1 - (first_order_discount / 100));
      END IF;
    END IF;
  END IF;

  -- تجاهل السعر المبعوث من الواجهة واستخدام السعر المحسوب بشكل آمن
  NEW.total_amount := final_subtotal + delivery_cost;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_secure_calculate_order_total ON orders;
CREATE TRIGGER trg_secure_calculate_order_total
BEFORE INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION secure_calculate_order_total();
