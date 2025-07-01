-- Adicionar colunas do Mercado Pago na tabela companies
-- Se as colunas já existirem, este comando falhará (isso é esperado)

-- Tente adicionar cada coluna individualmente
-- Se já existir, pule para a próxima

-- Coluna mercadopago_enabled
ALTER TABLE companies 
ADD COLUMN mercadopago_enabled INT NOT NULL DEFAULT 0;

-- Coluna mercadopago_access_token  
ALTER TABLE companies 
ADD COLUMN mercadopago_access_token VARCHAR(500) DEFAULT NULL;

-- Coluna mercadopago_public_key
ALTER TABLE companies 
ADD COLUMN mercadopago_public_key VARCHAR(255) DEFAULT NULL;