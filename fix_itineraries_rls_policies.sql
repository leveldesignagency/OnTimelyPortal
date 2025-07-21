-- Remove old policies that use ::uuid or are redundant
DROP POLICY IF EXISTS "Users can create itineraries in their company" ON public.itineraries;
DROP POLICY IF EXISTS "Users can update company itineraries" ON public.itineraries;
DROP POLICY IF EXISTS "Users can view company itineraries" ON public.itineraries;
DROP POLICY IF EXISTS "Users can delete company itineraries" ON public.itineraries;
DROP POLICY IF EXISTS "Company isolation for itineraries" ON public.itineraries;
DROP POLICY IF EXISTS "Insert itineraries for own company" ON public.itineraries;

-- Recreate policies using text comparison for company_id

CREATE POLICY "Users can create itineraries in their company"
ON public.itineraries
FOR INSERT
TO public
WITH CHECK (
  company_id IN (SELECT users.company_id FROM users WHERE users.id = auth.uid())
);

CREATE POLICY "Users can update company itineraries"
ON public.itineraries
FOR UPDATE
TO public
USING (
  company_id IN (SELECT users.company_id FROM users WHERE users.id = auth.uid())
);

CREATE POLICY "Users can view company itineraries"
ON public.itineraries
FOR SELECT
TO public
USING (
  company_id IN (SELECT users.company_id FROM users WHERE users.id = auth.uid())
);

CREATE POLICY "Users can delete company itineraries"
ON public.itineraries
FOR DELETE
TO public
USING (
  company_id IN (SELECT users.company_id FROM users WHERE users.id = auth.uid())
);

-- Company isolation policy (optional, for extra safety)
CREATE POLICY "Company isolation for itineraries"
ON public.itineraries
FOR ALL
TO public
USING (
  company_id = (auth.jwt() ->> 'company_id')
);

-- Insert policy for own company (optional, for extra safety)
CREATE POLICY "Insert itineraries for own company"
ON public.itineraries
FOR INSERT
TO public
WITH CHECK (
  company_id = (auth.jwt() ->> 'company_id')
);

-- Ensure RLS is enabled
ALTER TABLE public.itineraries ENABLE ROW LEVEL SECURITY; 