-- Add stock column to products table
ALTER TABLE products ADD COLUMN stock INTEGER DEFAULT 0;

-- Initialize existing products with 10 stock
UPDATE products SET stock = 10;

-- Create an RPC to safely decrement stock upon order placement
CREATE OR REPLACE FUNCTION decrement_stock(product_id UUID, quantity INTEGER)
RETURNS VOID AS $$
BEGIN
  -- We allow stock to go below zero theoretically if concurrency happens, but we enforce stock >= 0 on the frontend.
  -- Alternatively, we can use an IF condition or just run the update.
  UPDATE products 
  SET stock = GREATEST(stock - quantity, 0)
  WHERE id = product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
