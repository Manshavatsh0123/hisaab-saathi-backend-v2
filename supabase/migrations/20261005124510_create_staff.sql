-- ============================================================
-- HisaabSaathi
-- Migration: Create staff
-- ============================================================

CREATE TABLE public.staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL UNIQUE
    REFERENCES public.profiles(id)
    ON DELETE CASCADE,

  staff_code VARCHAR(50) NOT NULL UNIQUE,

  created_by UUID
    REFERENCES public.profiles(id)
    ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);