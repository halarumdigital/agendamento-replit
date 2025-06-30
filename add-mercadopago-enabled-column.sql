-- Add mercadopago_enabled column to companies table
ALTER TABLE companies ADD COLUMN mercadopago_enabled INT NOT NULL DEFAULT 0;