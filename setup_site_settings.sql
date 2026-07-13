-- Add text_value column to store_settings table for storing image URLs and text settings
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS text_value TEXT;

-- Insert default keys for logos if they don't exist (values will be updated via dashboard)
INSERT INTO store_settings (key, text_value)
VALUES 
  ('navbar_logo', ''),
  ('footer_logo', '')
ON CONFLICT (key) DO NOTHING;
