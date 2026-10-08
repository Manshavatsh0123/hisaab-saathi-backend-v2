-- ============================================================
-- HisaabSaathi
-- Migration: Create Payment Business Logic Functions
-- ============================================================

-- ============================================================
-- 1. SUBMIT PAYMENT
-- Staff submits a collection.
-- Payment is created as PENDING.
-- ============================================================

CREATE OR REPLACE FUNCTION public.submit_payment(
  p_customer_id UUID,
  p_account_id UUID,
  p_amount NUMERIC(12, 2),
  p_payment_date DATE,
  p_created_by UUID,
  p_reference_number VARCHAR(100) DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment_id UUID;
  v_role public.user_role;
BEGIN

  -- Check actor role
  SELECT role
  INTO v_role
  FROM public.profiles
  WHERE id = p_created_by;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Invalid staff user';
  END IF;

  IF v_role NOT IN ('STAFF', 'ADMIN') THEN
    RAISE EXCEPTION 'Only STAFF or ADMIN can submit payments';
  END IF;

  -- Insert payment as PENDING
  INSERT INTO public.payments (
    customer_id,
    account_id,
    amount,
    payment_date,
    reference_number,
    status,
    created_by,
    submitted_at,
    notes
  )
  VALUES (
    p_customer_id,
    p_account_id,
    p_amount,
    p_payment_date,
    p_reference_number,
    'PENDING',
    p_created_by,
    NOW(),
    p_notes
  )
  RETURNING id INTO v_payment_id;

  RETURN v_payment_id;

END;
$$;


-- ============================================================
-- 2. APPROVE PAYMENT
-- Admin approves a PENDING payment.
-- ============================================================

CREATE OR REPLACE FUNCTION public.approve_payment(
  p_payment_id UUID,
  p_approved_by UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.user_role;
  v_payment_id UUID;
BEGIN

  -- Check admin role
  SELECT role
  INTO v_role
  FROM public.profiles
  WHERE id = p_approved_by;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Invalid user';
  END IF;

  IF v_role <> 'ADMIN' THEN
    RAISE EXCEPTION 'Only ADMIN can approve payments';
  END IF;

  -- Update only PENDING payment
  UPDATE public.payments
  SET
    status = 'APPROVED',
    approved_by = p_approved_by,
    approved_at = NOW(),
    updated_at = NOW()
  WHERE id = p_payment_id
    AND status = 'PENDING'
  RETURNING id INTO v_payment_id;

  IF v_payment_id IS NULL THEN
    RAISE EXCEPTION 'Payment not found or is not PENDING';
  END IF;

  RETURN v_payment_id;

END;
$$;


-- ============================================================
-- 3. REJECT PAYMENT
-- Admin rejects a PENDING payment.
-- ============================================================

CREATE OR REPLACE FUNCTION public.reject_payment(
  p_payment_id UUID,
  p_rejected_by UUID,
  p_rejection_reason TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.user_role;
  v_payment_id UUID;
BEGIN

  -- Check admin role
  SELECT role
  INTO v_role
  FROM public.profiles
  WHERE id = p_rejected_by;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Invalid user';
  END IF;

  IF v_role <> 'ADMIN' THEN
    RAISE EXCEPTION 'Only ADMIN can reject payments';
  END IF;

  IF p_rejection_reason IS NULL
     OR LENGTH(TRIM(p_rejection_reason)) = 0 THEN
    RAISE EXCEPTION 'Rejection reason is required';
  END IF;

  -- Update only PENDING payment
  UPDATE public.payments
  SET
    status = 'REJECTED',
    rejected_by = p_rejected_by,
    rejected_at = NOW(),
    rejection_reason = TRIM(p_rejection_reason),
    updated_at = NOW()
  WHERE id = p_payment_id
    AND status = 'PENDING'
  RETURNING id INTO v_payment_id;

  IF v_payment_id IS NULL THEN
    RAISE EXCEPTION 'Payment not found or is not PENDING';
  END IF;

  RETURN v_payment_id;

END;
$$;


-- ============================================================
-- 4. FUNCTION PERMISSIONS
-- Only backend service_role should execute these functions.
-- ============================================================

REVOKE ALL ON FUNCTION public.submit_payment(
  UUID,
  UUID,
  NUMERIC,
  DATE,
  UUID,
  VARCHAR,
  TEXT
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.approve_payment(
  UUID,
  UUID
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.reject_payment(
  UUID,
  UUID,
  TEXT
) FROM PUBLIC;


GRANT EXECUTE ON FUNCTION public.submit_payment(
  UUID,
  UUID,
  NUMERIC,
  DATE,
  UUID,
  VARCHAR,
  TEXT
) TO service_role;

GRANT EXECUTE ON FUNCTION public.approve_payment(
  UUID,
  UUID
) TO service_role;

GRANT EXECUTE ON FUNCTION public.reject_payment(
  UUID,
  UUID,
  TEXT
) TO service_role;