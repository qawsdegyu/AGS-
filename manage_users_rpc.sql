-- دالة حذف حساب مستخدم
CREATE OR REPLACE FUNCTION delete_registered_user(user_id uuid)
RETURNS void
SECURITY DEFINER
AS $$
BEGIN
  -- التحقق من صلاحيات الإدمن (يجب أن يكون البريد الإلكتروني مسجلاً في جدول admin_users)
  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE admin_users.email = auth.jwt() ->> 'email') THEN
    RAISE EXCEPTION 'Not authorized - ليس لديك صلاحية للوصول لهذه البيانات';
  END IF;

  DELETE FROM auth.users WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;

-- تفعيل pgcrypto لاستخدام دوال التشفير
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- دالة إضافة حساب مستخدم
CREATE OR REPLACE FUNCTION create_registered_user(user_email text, user_password text, user_name text)
RETURNS uuid
SECURITY DEFINER
AS $$
DECLARE
  new_user_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE admin_users.email = auth.jwt() ->> 'email') THEN
    RAISE EXCEPTION 'Not authorized - ليس لديك صلاحية للوصول لهذه البيانات';
  END IF;

  -- التحقق إذا كان البريد مستخدم مسبقا
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = user_email) THEN
    RAISE EXCEPTION 'البريد الإلكتروني مستخدم مسبقاً';
  END IF;

  new_user_id := gen_random_uuid();
  
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, 
    created_at, updated_at, role, is_super_admin, aud, confirmation_token
  )
  VALUES (
    new_user_id,
    '00000000-0000-0000-0000-000000000000',
    user_email,
    crypt(user_password, gen_salt('bf')),
    now(),
    jsonb_build_object('full_name', user_name),
    now(),
    now(),
    'authenticated',
    false,
    'authenticated',
    ''
  );
  
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  )
  VALUES (
    gen_random_uuid(),
    new_user_id,
    jsonb_build_object('sub', new_user_id, 'email', user_email, 'email_verified', true),
    'email',
    now(),
    now(),
    now()
  );

  RETURN new_user_id;
END;
$$ LANGUAGE plpgsql;
