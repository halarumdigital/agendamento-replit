-- Add Mercado Pago configuration columns to companies table
ALTER TABLE companies 
ADD COLUMN mercadopago_access_token VARCHAR(500) DEFAULT NULL,
ADD COLUMN mercadopago_public_key VARCHAR(255) DEFAULT NULL,
ADD COLUMN mercadopago_webhook_url VARCHAR(500) DEFAULT NULL;