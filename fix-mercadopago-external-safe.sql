-- Script SEGURO para adicionar colunas do Mercado Pago no banco externo
-- Compatível com MySQL 5.7 e versões anteriores
-- Execute este script diretamente no seu banco de dados externo

-- Verifica e adiciona mercadopago_enabled
SET @columnExists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'companies' 
    AND COLUMN_NAME = 'mercadopago_enabled'
);

SET @sql = IF(@columnExists = 0, 
    'ALTER TABLE companies ADD COLUMN mercadopago_enabled INT NOT NULL DEFAULT 0',
    'SELECT "Column mercadopago_enabled already exists"'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verifica e adiciona mercadopago_access_token
SET @columnExists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'companies' 
    AND COLUMN_NAME = 'mercadopago_access_token'
);

SET @sql = IF(@columnExists = 0, 
    'ALTER TABLE companies ADD COLUMN mercadopago_access_token VARCHAR(500) DEFAULT NULL',
    'SELECT "Column mercadopago_access_token already exists"'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verifica e adiciona mercadopago_public_key
SET @columnExists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'companies' 
    AND COLUMN_NAME = 'mercadopago_public_key'
);

SET @sql = IF(@columnExists = 0, 
    'ALTER TABLE companies ADD COLUMN mercadopago_public_key VARCHAR(255) DEFAULT NULL',
    'SELECT "Column mercadopago_public_key already exists"'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verifica e adiciona mercadopago_webhook_url (opcional)
SET @columnExists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'companies' 
    AND COLUMN_NAME = 'mercadopago_webhook_url'
);

SET @sql = IF(@columnExists = 0, 
    'ALTER TABLE companies ADD COLUMN mercadopago_webhook_url VARCHAR(500) DEFAULT NULL',
    'SELECT "Column mercadopago_webhook_url already exists"'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verifica se as colunas foram criadas
SHOW COLUMNS FROM companies LIKE 'mercadopago%';