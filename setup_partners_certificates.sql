-- إنشاء جدول الشركاء والماركات (Partners & Brands)
CREATE TABLE IF NOT EXISTS public.company_partners (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    logo_url TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- إنشاء جدول الشهادات والاعتمادات (Certificates & Accreditations)
CREATE TABLE IF NOT EXISTS public.company_certificates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    image_url TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- إعداد الصلاحيات (RLS) للشركاء
ALTER TABLE public.company_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on partners"
    ON public.company_partners
    FOR SELECT
    USING (true);

CREATE POLICY "Allow full access to partners for admins and authenticated users"
    ON public.company_partners
    FOR ALL
    USING (auth.role() = 'authenticated');

-- إعداد الصلاحيات (RLS) للشهادات
ALTER TABLE public.company_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on certificates"
    ON public.company_certificates
    FOR SELECT
    USING (true);

CREATE POLICY "Allow full access to certificates for admins and authenticated users"
    ON public.company_certificates
    FOR ALL
    USING (auth.role() = 'authenticated');
