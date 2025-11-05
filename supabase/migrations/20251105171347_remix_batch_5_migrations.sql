
-- Migration: 20251023121429
-- Create profiles table with referral codes
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  referral_code TEXT UNIQUE NOT NULL DEFAULT substring(md5(random()::text), 1, 8),
  referred_by UUID REFERENCES public.profiles(id),
  total_earnings DECIMAL(10,2) DEFAULT 0,
  withdrawable_balance DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create cards table
CREATE TABLE public.cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  description TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create purchases table
CREATE TABLE public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  card_id UUID REFERENCES public.cards(id) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  commission_to_referrer DECIMAL(10,2) DEFAULT 0,
  referrer_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create earnings table for tracking commission history
CREATE TABLE public.earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  source_purchase_id UUID REFERENCES public.purchases(id),
  from_user_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create withdrawals table
CREATE TABLE public.withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  method TEXT NOT NULL,
  account_details JSONB NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for cards
CREATE POLICY "Anyone can view active cards" ON public.cards FOR SELECT USING (is_active = true);

-- RLS Policies for purchases
CREATE POLICY "Users can view own purchases" ON public.purchases FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create purchases" ON public.purchases FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for earnings
CREATE POLICY "Users can view own earnings" ON public.earnings FOR SELECT USING (auth.uid() = user_id);

-- RLS Policies for withdrawals
CREATE POLICY "Users can view own withdrawals" ON public.withdrawals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create withdrawals" ON public.withdrawals FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to handle purchase and commission
CREATE OR REPLACE FUNCTION public.process_purchase(
  p_card_id UUID,
  p_user_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card_price DECIMAL(10,2);
  v_referrer_id UUID;
  v_commission DECIMAL(10,2);
  v_purchase_id UUID;
BEGIN
  -- Get card price
  SELECT price INTO v_card_price FROM public.cards WHERE id = p_card_id;
  
  -- Get referrer
  SELECT referred_by INTO v_referrer_id FROM public.profiles WHERE id = p_user_id;
  
  -- Calculate commission (50%)
  v_commission := v_card_price * 0.5;
  
  -- Create purchase record
  INSERT INTO public.purchases (user_id, card_id, amount, commission_to_referrer, referrer_id)
  VALUES (p_user_id, p_card_id, v_card_price, v_commission, v_referrer_id)
  RETURNING id INTO v_purchase_id;
  
  -- If user has referrer, add commission
  IF v_referrer_id IS NOT NULL THEN
    -- Add to earnings
    INSERT INTO public.earnings (user_id, amount, source_purchase_id, from_user_id)
    VALUES (v_referrer_id, v_commission, v_purchase_id, p_user_id);
    
    -- Update referrer balance
    UPDATE public.profiles 
    SET total_earnings = total_earnings + v_commission,
        withdrawable_balance = withdrawable_balance + v_commission
    WHERE id = v_referrer_id;
  END IF;
  
  RETURN jsonb_build_object('success', true, 'purchase_id', v_purchase_id);
END;
$$;

-- Insert default cards
INSERT INTO public.cards (title, price, description) VALUES
  ('Starter Card', 100, 'Begin your earning journey'),
  ('Silver Card', 200, 'Double your potential'),
  ('Gold Card', 300, 'Premium earning power'),
  ('Platinum Card', 500, 'Maximum commission rate');


-- Migration: 20251024065836
-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Only admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete roles"
ON public.user_roles
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all withdrawals
CREATE POLICY "Admins can view all withdrawals"
ON public.withdrawals
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to update withdrawal status
CREATE POLICY "Admins can update withdrawals"
ON public.withdrawals
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all purchases
CREATE POLICY "Admins can view all purchases"
ON public.purchases
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all earnings
CREATE POLICY "Admins can view all earnings"
ON public.earnings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Migration: 20251025071715
-- Add storage bucket for payment screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their payment screenshots
CREATE POLICY "Users can upload payment screenshots"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'payment-proofs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to view their own screenshots
CREATE POLICY "Users can view own payment screenshots"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'payment-proofs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow admins to view all payment screenshots
CREATE POLICY "Admins can view all payment screenshots"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'payment-proofs' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Add payment screenshot field to purchases table
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS payment_screenshot_url TEXT;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'manual';
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending';

-- Add index for verification status
CREATE INDEX IF NOT EXISTS idx_purchases_verification_status ON purchases(verification_status);

-- Migration: 20251026052314
-- Add is_banned field to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;

-- Update cards table to allow admin updates
CREATE POLICY "Admins can update cards"
ON public.cards
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can insert cards"
ON public.cards
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Allow admins to update profiles (for banning users)
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Update purchases to allow admin updates (for verification)
CREATE POLICY "Admins can update purchases"
ON public.purchases
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Prevent banned users from creating purchases
CREATE POLICY "Banned users cannot create purchases"
ON public.purchases
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND 
  NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_banned = true
  )
);

-- Migration: 20251028061141
-- Create OTP verification table
CREATE TABLE IF NOT EXISTS public.email_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add index for faster lookups
CREATE INDEX idx_email_verifications_email ON public.email_verifications(email);
CREATE INDEX idx_email_verifications_expires_at ON public.email_verifications(expires_at);

-- Add email_verified column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

-- Enable RLS
ALTER TABLE public.email_verifications ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (for signup)
CREATE POLICY "Anyone can create OTP" ON public.email_verifications
  FOR INSERT WITH CHECK (true);

-- Allow users to view their own OTP records
CREATE POLICY "Users can view own OTP" ON public.email_verifications
  FOR SELECT USING (auth.jwt() ->> 'email' = email OR auth.role() = 'anon');

-- Make sure payment-proofs bucket is public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'payment-proofs';
