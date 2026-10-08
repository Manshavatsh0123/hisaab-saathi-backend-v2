-- ============================================================
-- HisaabSaathi
-- Migration: Create notifications
-- ============================================================

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  recipient_id UUID NOT NULL
    REFERENCES public.profiles(id)
    ON DELETE CASCADE,

  payment_id UUID
    REFERENCES public.payments(id)
    ON DELETE CASCADE,

  type VARCHAR(50) NOT NULL,

  title VARCHAR(150) NOT NULL,

  message TEXT NOT NULL,

  is_read BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);