-- Run this script in the Supabase SQL Editor to add the document_url column

ALTER TABLE products
ADD COLUMN IF NOT EXISTS document_url TEXT;

-- You can now insert URLs of product documents (e.g., PDF manuals, datasheets)
-- into the 'document_url' column for any product.
