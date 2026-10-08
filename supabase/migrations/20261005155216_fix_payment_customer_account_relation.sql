-- ============================================================
-- Fix Payment -> Customer Account Data Integrity
-- ============================================================

-- 1. Make (id, customer_id) uniquely referenceable
ALTER TABLE public.customer_accounts
ADD CONSTRAINT customer_accounts_id_customer_id_unique
UNIQUE (id, customer_id);


-- 2. Ensure payment's account belongs to the payment's customer
ALTER TABLE public.payments
ADD CONSTRAINT payments_account_customer_fkey
FOREIGN KEY (account_id, customer_id)
REFERENCES public.customer_accounts (id, customer_id)
ON DELETE RESTRICT;