-- ============================================================
-- HisaabSaathi
-- Migration: Create profiles
-- ============================================================

-- Role enum
CREATE TYPE public.user_role AS ENUM (
  'ADMIN',
  'STAFF',
  'CUSTOMER'
);

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY
    REFERENCES auth.users(id)
    ON DELETE CASCADE,

  role public.user_role NOT NULL,

  username VARCHAR(100) UNIQUE,

  full_name VARCHAR(150),

  phone VARCHAR(20),

  status TEXT NOT NULL DEFAULT 'ACTIVE',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);