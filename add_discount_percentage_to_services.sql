-- Add discount_percentage column to services table
ALTER TABLE services ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC DEFAULT 0;
