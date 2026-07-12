-- Run this script in the Supabase SQL Editor

-- Add the documents column as JSONB with an empty array as default
ALTER TABLE products
ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]'::jsonb;
