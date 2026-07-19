-- تحديث دالة إحصائيات لوحة التحكم لدعم الفلاتر الزمنية
CREATE OR REPLACE FUNCTION get_dashboard_stats(period_filter TEXT DEFAULT 'all')
RETURNS JSONB AS $$
DECLARE
  res JSONB;
  start_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- تحديد تاريخ البداية بناءً على الفلتر
  IF period_filter = 'today' THEN
    start_date := date_trunc('day', now());
  ELSIF period_filter = 'week' THEN
    start_date := date_trunc('week', now());
  ELSIF period_filter = 'month' THEN
    start_date := date_trunc('month', now());
  ELSIF period_filter = 'year' THEN
    start_date := date_trunc('year', now());
  ELSE
    start_date := '1970-01-01'::TIMESTAMP WITH TIME ZONE; -- كل الوقت
  END IF;

  SELECT jsonb_build_object(
    'products_count', (SELECT COUNT(*) FROM products), -- إجمالي المنتجات يبقى ثابتاً لأنه يعكس حجم المتجر
    'rfqs_count', (SELECT COUNT(*) FROM rfqs WHERE created_at >= start_date),
    'pending_rfqs_count', (SELECT COUNT(*) FROM rfqs WHERE status = 'انتظار' AND created_at >= start_date),
    'orders_count', (SELECT COUNT(*) FROM orders WHERE created_at >= start_date),
    'new_orders_count', (SELECT COUNT(*) FROM orders WHERE status = 'جديد' AND created_at >= start_date),
    'sales_total', COALESCE((SELECT SUM(total_amount) FROM orders WHERE payment_status = 'مدفوع' AND created_at >= start_date), 0)
  ) INTO res;
  
  RETURN res;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
