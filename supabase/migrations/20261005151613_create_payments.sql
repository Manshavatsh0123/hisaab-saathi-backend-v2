CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  customer_id UUID NOT NULL
    REFERENCES public.customers(id)
    ON DELETE RESTRICT,

  account_id UUID NOT NULL
    REFERENCES public.customer_accounts(id)
    ON DELETE RESTRICT,

  amount NUMERIC(12, 2) NOT NULL
    CHECK (amount > 0),

  payment_date DATE NOT NULL,

  reference_number VARCHAR(100),

  status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
    CHECK (
      status IN (
        'PENDING',
        'APPROVED',
        'REJECTED',
        'REVERSED'
      )
    ),

  created_by UUID NOT NULL
    REFERENCES public.profiles(id)
    ON DELETE RESTRICT,

  approved_by UUID
    REFERENCES public.profiles(id)
    ON DELETE SET NULL,

  rejected_by UUID
    REFERENCES public.profiles(id)
    ON DELETE SET NULL,

  reversed_by UUID
    REFERENCES public.profiles(id)
    ON DELETE SET NULL,

  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  approved_at TIMESTAMPTZ,

  rejected_at TIMESTAMPTZ,

  reversed_at TIMESTAMPTZ,

  rejection_reason TEXT,

  reversal_reason TEXT,

  receipt_number VARCHAR(100) UNIQUE,

  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);