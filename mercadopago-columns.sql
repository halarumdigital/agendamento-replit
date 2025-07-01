-- Adicionar colunas do Mercado Pago na tabela companies

ALTER TABLE companies 
ADD COLUMN mercadopago_enabled INT NOT NULL DEFAULT 0,
ADD COLUMN mercadopago_access_token VARCHAR(500) DEFAULT NULL,
ADD COLUMN mercadopago_public_key VARCHAR(255) DEFAULT NULL;