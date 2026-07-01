-- ============================================================
-- VELORA UNIVERSAL CHECKOUT SYSTEM - DATABASE FIX
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Step 1: Make customer_id nullable (so guest orders can be saved)
ALTER TABLE orders ALTER COLUMN customer_id DROP NOT NULL;

-- Step 2: Add guest-specific fields and payment method for orders without login
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS guest_name TEXT,
  ADD COLUMN IF NOT EXISTS guest_phone TEXT,
  ADD COLUMN IF NOT EXISTS guest_email TEXT,
  ADD COLUMN IF NOT EXISTS order_ref TEXT UNIQUE, -- human-readable order number like VLR-000123
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash_on_delivery'; -- cash_on_delivery, mtn_momo, airtel_money

-- Step 3: Generate order references for existing orders
UPDATE orders SET order_ref = 'VLR-' || LPAD(id::text, 6, '0') WHERE order_ref IS NULL;

-- Step 4: Auto-generate order_ref for new orders
CREATE OR REPLACE FUNCTION generate_order_ref()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_ref IS NULL THEN
    NEW.order_ref := 'VLR-' || LPAD((NEXTVAL('order_ref_seq'))::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for order numbers if not exists
CREATE SEQUENCE IF NOT EXISTS order_ref_seq START 1;

-- Drop existing trigger if any, then recreate
DROP TRIGGER IF EXISTS set_order_ref ON orders;
CREATE TRIGGER set_order_ref
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION generate_order_ref();

-- Step 5: Fix RLS policies for universal checkout

-- Drop old restrictive policies
DROP POLICY IF EXISTS "Customers can place orders" ON orders;
DROP POLICY IF EXISTS "Customers can view their own orders" ON orders;
DROP POLICY IF EXISTS "Vendors can view their store orders" ON orders;
DROP POLICY IF EXISTS "Vendors can update their store orders" ON orders;

-- Anyone can place an order (guest or logged in)
CREATE POLICY "Anyone can place orders"
  ON orders FOR INSERT WITH CHECK (true);

-- Logged-in customers can view their own orders
CREATE POLICY "Customers can view their own orders"
  ON orders FOR SELECT USING (
    customer_id IS NOT NULL AND auth.uid() = customer_id
  );

-- Vendors can view orders for their store
CREATE POLICY "Vendors can view their store orders"
  ON orders FOR SELECT USING (
    vendor_id = 'nova-nest-electronics'
  );

-- Vendors can update orders for their store (change status)
CREATE POLICY "Vendors can update their store orders"
  ON orders FOR UPDATE USING (
    vendor_id = 'nova-nest-electronics'
  );

-- Step 6: Update vendor profile name
UPDATE vendor_profiles 
SET name = 'Velora Electronics'
WHERE id = 'nova-nest-electronics';

INSERT INTO vendor_profiles (id, name, logo_url, location, category, verified)
VALUES ('nova-nest-electronics', 'Velora Electronics', null, 'Lusaka, Zambia', 'Electronics', true)
ON CONFLICT (id) DO UPDATE SET name = 'Velora Electronics';

-- Step 7: Add shipping notes for vendor use
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_notes TEXT;

-- Step 8: Ensure updated_at exists
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Step 9: Add extra_addresses to customer_profiles (for multiple addresses)
ALTER TABLE customer_profiles ADD COLUMN IF NOT EXISTS extra_addresses JSONB DEFAULT '[]'::jsonb;

-- Verify
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'orders' 
ORDER BY ordinal_position;

SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'customer_profiles' 
ORDER BY ordinal_position;