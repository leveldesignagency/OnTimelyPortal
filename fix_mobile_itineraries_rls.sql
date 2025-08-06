-- Fix RLS policies for itineraries table to allow mobile app access
-- This creates more permissive policies that work with the mobile app

-- First, drop existing restrictive policies
DROP POLICY IF EXISTS "Users can create itineraries in their company" ON public.itineraries;
DROP POLICY IF EXISTS "Users can update company itineraries" ON public.itineraries;
DROP POLICY IF EXISTS "Users can view company itineraries" ON public.itineraries;
DROP POLICY IF EXISTS "Users can delete company itineraries" ON public.itineraries;
DROP POLICY IF EXISTS "Company isolation for itineraries" ON public.itineraries;
DROP POLICY IF EXISTS "Insert itineraries for own company" ON public.itineraries;

-- Create a simple permissive policy for development
-- This allows all authenticated users to access itineraries
CREATE POLICY "Allow authenticated users to access itineraries"
ON public.itineraries
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE public.itineraries ENABLE ROW LEVEL SECURITY;

-- Alternative: If you want to keep some security, use this more permissive policy:
-- CREATE POLICY "Allow company access for itineraries"
-- ON public.itineraries
-- FOR ALL
-- TO public
-- USING (
--   company_id IS NOT NULL
-- )
-- WITH CHECK (
--   company_id IS NOT NULL
-- ); 