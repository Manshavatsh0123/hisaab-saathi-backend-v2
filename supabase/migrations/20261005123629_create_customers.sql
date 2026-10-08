-- ============================================================
-- HisaabSaathi
-- Migration: Create customers
-- ============================================================

CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID UNIQUE
    REFERENCES public.profiles(id)
    ON DELETE SET NULL,

  customer_code VARCHAR(50) NOT NULL UNIQUE,

  full_name VARCHAR(150) NOT NULL,

  phone VARCHAR(20) NOT NULL,

  alternate_phone VARCHAR(20),

  aadhaar_number VARCHAR(12),

  pan_number VARCHAR(10),

  nominee_name VARCHAR(150),

  status TEXT NOT NULL DEFAULT 'ACTIVE',

  created_by UUID
    REFERENCES public.profiles(id)
    ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);