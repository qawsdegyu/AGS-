-- Add discount_percentage column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC DEFAULT 0;
