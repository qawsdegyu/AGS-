-- ========================================================
-- دالة استخراج بيانات المستخدمين (للوحة التحكم فقط)
-- ========================================================
-- هذه الدالة تقوم بقراءة جدول المستخدمين (auth.users)
-- وتسمح فقط للإدمن برؤية البيانات.

CREATE OR REPLACE FUNCTION get_registered_users()
RETURNS TABLE (id uuid, email varchar, name text, created_at timestamptz)
SECURITY DEFINER
AS $$
BEGIN
  -- التحقق من صلاحيات الإدمن (يجب أن يكون البريد الإلكتروني مسجلاً في جدول admin_users)
  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE admin_users.email = auth.jwt() ->> 'email') THEN
    RAISE EXCEPTION 'Not authorized - ليس لديك صلاحية للوصول لهذه البيانات';
  END IF;

  RETURN QUERY
  SELECT 
    au.id, 
    au.email::varchar, 
    (au.raw_user_meta_data->>'full_name')::text as name, 
    au.created_at
  FROM auth.users au
  ORDER BY au.created_at DESC;
END;
$$ LANGUAGE plpgsql;
