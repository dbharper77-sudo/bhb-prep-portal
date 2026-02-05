-- UPDATED LIQUIDATION TABLE - Safe version
-- This won't error on existing objects

-- Drop and recreate liquidation_stock table
DROP TABLE IF EXISTS public.liquidation_stock CASCADE;

CREATE TABLE public.liquidation_stock (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  
  -- Client submitted fields
  removal_order_id text,
  product_name text NOT NULL,
  asin text,
  sku text,
  fnsku text,
  
  -- Admin fields
  lpn_number text,
  date_delivered date,
  condition text,
  pictures_on_drive boolean DEFAULT false,
  comments text,
  date_listed date,
  sale_price numeric(10,2),
  date_sold date,
  ebay_fees numeric(10,2),
  shipping numeric(10,2),
  
  -- Fixed fee checkboxes
  fee_prep boolean DEFAULT false,
  fee_bundle boolean DEFAULT false,
  fee_oversize boolean DEFAULT false,
  
  -- Payout tracking
  paid boolean DEFAULT false,
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.liquidation_stock ENABLE ROW LEVEL SECURITY;

-- Policies for liquidation_stock
CREATE POLICY "liq_select" ON public.liquidation_stock FOR SELECT USING (true);
CREATE POLICY "liq_insert" ON public.liquidation_stock FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "liq_update" ON public.liquidation_stock FOR UPDATE USING (true);
CREATE POLICY "liq_delete" ON public.liquidation_stock FOR DELETE USING (auth.uid() = user_id);

-- Add admin_notes column to parcels
ALTER TABLE public.parcels ADD COLUMN IF NOT EXISTS admin_notes text;

-- Create profiles table (skip if exists)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email text,
  full_name text,
  company_name text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop old policies first, then create new ones
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;

CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Update trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, company_name)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'company_name'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
