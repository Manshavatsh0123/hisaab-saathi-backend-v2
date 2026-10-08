-- ============================================================
-- HisaabSaathi
-- Migration: Create audit_logs
-- ============================================================

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  actor_id UUID
    REFERENCES public.profiles(id)
    ON DELETE SET NULL,

  action VARCHAR(100) NOT NULL,

  entity_type VARCHAR(50) NOT NULL,

  entity_id UUID,

  old_data JSONB,

  new_data JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);