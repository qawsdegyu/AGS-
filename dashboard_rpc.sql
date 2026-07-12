-- ========================================================
-- وظائف لوحة التحكم (Dashboard RPCs)
-- هذا الملف يحتوي على استعلامات دقيقة لحساب الإحصائيات 
-- في قاعدة البيانات لزيادة السرعة والدقة (Backend Aggregation)
-- ========================================================

-- 1. إحصائيات لوحة التحكم الأساسية (البطاقات الأربعة)
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS JSONB AS $$
DECLARE
  res JSONB;
BEGIN
  SELECT jsonb_build_object(
    'products_count', (SELECT COUNT(*) FROM products),
    'rfqs_count', (SELECT COUNT(*) FROM rfqs),
    'pending_rfqs_count', (SELECT COUNT(*) FROM rfqs WHERE status = 'انتظار'),
    'orders_count', (SELECT COUNT(*) FROM orders),
    'new_orders_count', (SELECT COUNT(*) FROM orders WHERE status = 'جديد'),
    'sales_total', COALESCE((SELECT SUM(total_amount) FROM orders WHERE status != 'ملغى'), 0)
  ) INTO res;
  
  RETURN res;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. إحصائيات المبيعات حسب الفئة (للرسم البياني الدائري - Donut Chart)
CREATE OR REPLACE FUNCTION get_sales_by_category()
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'category', t.category,
      'revenue', t.total
    )
  ) INTO result
  FROM (
    SELECT 
      p.category,
      SUM(COALESCE((item->>'quantity')::int, 1) * COALESCE((item->>'price')::numeric, 0)) as total
    FROM orders,
    jsonb_array_elements(items) AS item
    JOIN products p ON p.id = COALESCE(item->>'productId', item->>'product_id')::uuid
    WHERE orders.status != 'ملغى'
    GROUP BY p.category
  ) t;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. إحصائيات المبيعات الشهرية (للرسم البياني الخطي - Line Chart)
CREATE OR REPLACE FUNCTION get_monthly_revenue()
RETURNS JSONB AS $$
DECLARE
  res JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'month_index', extract(month from t.created_at) - 1, -- JavaScript months are 0-indexed
      'revenue', t.total
    )
  ) INTO res
  FROM (
    SELECT 
      MAX(created_at) as created_at,
      SUM(total_amount) as total
    FROM orders
    WHERE status != 'ملغى'
      AND created_at >= date_trunc('month', now()) - interval '6 months'
    GROUP BY date_trunc('month', created_at)
    ORDER BY date_trunc('month', created_at)
  ) t;
  
  RETURN COALESCE(res, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. أعلى 5 منتجات مبيعاً (Top 5 Products)
CREATE OR REPLACE FUNCTION get_top_products()
RETURNS JSONB AS $$
DECLARE
  res JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'name', p.title,
      'category', p.category,
      'qty', t.qty,
      'revenue', t.revenue
    )
  ) INTO res
  FROM (
    SELECT 
      COALESCE((item->>'productId'), (item->>'product_id'))::uuid as pid,
      SUM(COALESCE((item->>'quantity')::int, 1)) as qty,
      SUM(COALESCE((item->>'quantity')::int, 1) * COALESCE((item->>'price')::numeric, 0)) as revenue
    FROM orders,
    jsonb_array_elements(items) AS item
    WHERE status != 'ملغى'
    GROUP BY COALESCE((item->>'productId'), (item->>'product_id'))::uuid
    ORDER BY qty DESC
    LIMIT 5
  ) t
  JOIN products p ON p.id = t.pid;
  
  RETURN COALESCE(res, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
