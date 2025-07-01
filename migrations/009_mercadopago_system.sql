-- Migration: 009_mercadopago_system.sql
-- Description: Add Mercado Pago columns to companies table
-- Date: 2025-07-01

-- Add Mercado Pago configuration columns to companies table
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS mercadopago_enabled INT NOT NULL DEFAULT 0;

ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS mercadopago_access_token VARCHAR(500) DEFAULT NULL;

ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS mercadopago_public_key VARCHAR(255) DEFAULT NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_companies_mercadopago_enabled ON companies(mercadopago_enabled);