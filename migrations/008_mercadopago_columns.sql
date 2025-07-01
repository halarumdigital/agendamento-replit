-- Migration: Add Mercado Pago columns to companies table
-- Date: 2025-07-01
-- Description: Adds mercadopago_enabled, mercadopago_access_token and mercadopago_public_key columns

-- Add mercadopago_enabled column if it doesn't exist
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS mercadopago_enabled INT NOT NULL DEFAULT 0;

-- Add mercadopago_access_token column if it doesn't exist
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS mercadopago_access_token TEXT DEFAULT NULL;

-- Add mercadopago_public_key column if it doesn't exist
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS mercadopago_public_key TEXT DEFAULT NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_companies_mercadopago_enabled ON companies(mercadopago_enabled);