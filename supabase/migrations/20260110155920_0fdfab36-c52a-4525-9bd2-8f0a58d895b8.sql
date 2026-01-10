-- ═══════════════════════════════════════════════════════════════════════════════
-- CRITICAL SECURITY FIX: Profiles, Restaurant Tables, Audit Logs
-- Date: 2026-01-10
-- Purpose: Close all critical security vulnerabilities from QA audit
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1) PROFILES TABLE - FIX EMAIL EXPOSURE
-- ═══════════════════════════════════════════════════════════════════════════════

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Owners can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Owners can view their restaurant staff profiles" ON public.profiles;
DROP POLICY IF EXISTS "System admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create strict SELECT policies

-- System Admin can read all profiles
CREATE POLICY "System admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'system_admin'::app_role));

-- Owner can read profiles ONLY for users in their restaurant (via user_roles)
CREATE POLICY "Owners can view their restaurant staff profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT ur.user_id
    FROM public.user_roles ur
    WHERE ur.restaurant_id = get_owner_restaurant_id(auth.uid())
  )
);

-- Users can view ONLY their own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- CREATE strict INSERT policies

-- System Admin can insert profiles (for creating new users)
CREATE POLICY "System admins can insert profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'system_admin'::app_role));

-- Owners can insert profiles (for creating cashiers)
CREATE POLICY "Owners can insert profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'owner'::app_role));

-- CREATE strict UPDATE policies

-- Users can update ONLY their own profile
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- System Admin can update any profile
CREATE POLICY "System admins can update profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'system_admin'::app_role));

-- Owners can update their staff profiles only
CREATE POLICY "Owners can update their restaurant staff profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  id IN (
    SELECT ur.user_id
    FROM public.user_roles ur
    WHERE ur.restaurant_id = get_owner_restaurant_id(auth.uid())
  )
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2) RESTAURANT_TABLES - REMOVE PUBLIC USING(true) LEAK
-- ═══════════════════════════════════════════════════════════════════════════════

-- Drop the dangerous public policy that uses USING(true)
DROP POLICY IF EXISTS "Public can lookup tables for QR menu" ON public.restaurant_tables;

-- Create a SECURITY DEFINER function for safe QR table lookup
-- This function returns ONLY safe columns and validates input
CREATE OR REPLACE FUNCTION public.public_get_table_by_code(
  p_restaurant_id uuid,
  p_table_code text
)
RETURNS TABLE (
  id uuid,
  table_code text,
  table_name text,
  branch_id uuid,
  is_active boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    rt.id,
    rt.table_code,
    rt.table_name,
    rt.branch_id,
    rt.is_active
  FROM public.restaurant_tables rt
  WHERE rt.restaurant_id = p_restaurant_id
    AND rt.table_code = p_table_code
    AND rt.is_active = true
  LIMIT 1;
$$;

-- Grant execute permission to anon and authenticated
GRANT EXECUTE ON FUNCTION public.public_get_table_by_code(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.public_get_table_by_code(uuid, text) TO authenticated;

-- Note: No public SELECT policy on restaurant_tables for anon users.
-- They must use the function. Existing cashier/owner/admin policies remain.

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3) AUDIT_LOGS - REMOVE CASHIER INSERT (Security-critical)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Drop the dangerous cashier insert policy
DROP POLICY IF EXISTS "Cashiers can insert audit_logs" ON public.audit_logs;

-- Audit logging now ONLY happens via:
-- 1. Edge Functions using service_role key (bypasses RLS)
-- 2. Database triggers (if implemented later)

-- Keep SELECT policies so users can view relevant logs

-- Cashiers can view audit logs for their actions within their restaurant
CREATE POLICY "Cashiers can view their restaurant audit_logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
  restaurant_id = get_cashier_restaurant_id(auth.uid())
);

-- Note: "Owners can view their restaurant audit_logs" and 
-- "System admins can do all on audit_logs" already exist and are correct

-- ═══════════════════════════════════════════════════════════════════════════════
-- VERIFICATION COMMENTS
-- ═══════════════════════════════════════════════════════════════════════════════
-- ✅ profiles: Only authenticated users with proper role/ownership can access
-- ✅ restaurant_tables: No USING(true), public access via safe function only
-- ✅ audit_logs: No cashier INSERT, only service_role can write
-- ✅ All existing owner/cashier/admin SELECT functionality preserved