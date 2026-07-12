-- Create store_settings table
CREATE TABLE IF NOT EXISTS store_settings (
  key TEXT PRIMARY KEY,
  value NUMERIC DEFAULT 0
);

-- Insert default first order discount if it doesn't exist
INSERT INTO store_settings (key, value)
VALUES ('first_order_discount', 0)
ON CONFLICT (key) DO NOTHING;

-- Enable RLS
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access
DROP POLICY IF EXISTS "Allow public read access to store_settings" ON store_settings;
CREATE POLICY "Allow public read access to store_settings" ON store_settings FOR SELECT USING (true);

-- Allow public update/insert access (for simple dashboard management without strict auth)
DROP POLICY IF EXISTS "Allow public update access to store_settings" ON store_settings;
CREATE POLICY "Allow public update access to store_settings" ON store_settings FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public insert access to store_settings" ON store_settings;
CREATE POLICY "Allow public insert access to store_settings" ON store_settings FOR INSERT WITH CHECK (true);
