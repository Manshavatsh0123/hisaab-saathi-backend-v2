-- ============================================================
-- HisaabSaathi
-- Migration: Create customer_accounts
-- ============================================================

CREATE TABLE public.customer_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  customer_id UUID NOT NULL
    REFERENCES public.customers(id)
    ON DELETE CASCADE,

  account_number VARCHAR(50) NOT NULL UNIQUE,

  scheme VARCHAR(50) NOT NULL,

  account_name VARCHAR(150),

  collection_amount NUMERIC(12, 2) NOT NULL
    CHECK (collection_amount > 0),

  frequency VARCHAR(20) NOT NULL
    CHECK (
      frequency IN (
        'DAILY',
        'WEEKLY',
        'MONTHLY'
      )
    ),

  start_date DATE NOT NULL,

  maturity_date DATE,

  previous_paid NUMERIC(12, 2) NOT NULL DEFAULT 0
    CHECK (previous_paid >= 0),

  status TEXT NOT NULL DEFAULT 'ACTIVE',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

   CONSTRAINT customer_accounts_maturity_date_check
    CHECK (
      maturity_date IS NULL
      OR maturity_date >= start_date
    )
);