-- Script para adicionar colunas do Mercado Pago no banco externo
-- Execute este script diretamente no seu banco de dados externo

-- Adiciona coluna mercadopago_enabled se não existir
ALTER TABLE companies 
ADD COLUMN mercadopago_enabled INT NOT NULL DEFAULT 0;

-- Adiciona coluna mercadopago_access_token se não existir
ALTER TABLE companies 
ADD COLUMN mercadopago_access_token VARCHAR(500) DEFAULT NULL;

-- Adiciona coluna mercadopago_public_key se não existir
ALTER TABLE companies 
ADD COLUMN mercadopago_public_key VARCHAR(255) DEFAULT NULL;

-- Adiciona coluna mercadopago_webhook_url se não existir (opcional, caso precise)
ALTER TABLE companies 
ADD COLUMN mercadopago_webhook_url VARCHAR(500) DEFAULT NULL;

-- Cria índice para melhor performance
CREATE INDEX idx_companies_mercadopago_enabled ON companies(mercadopago_enabled);

-- Verifica se as colunas foram criadas
SHOW COLUMNS FROM companies LIKE 'mercadopago%';