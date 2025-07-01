-- Script de debug para verificar problemas com Mercado Pago no banco externo

-- 1. Verificar estrutura atual da tabela companies
SHOW CREATE TABLE companies;

-- 2. Verificar colunas existentes
SHOW COLUMNS FROM companies LIKE 'mercadopago%';

-- 3. Verificar privilégios do usuário
SHOW GRANTS FOR CURRENT_USER();

-- 4. Testar atualização simples
UPDATE companies 
SET mercadopago_enabled = 1 
WHERE id = 1;

-- 5. Verificar se a atualização funcionou
SELECT id, mercadopago_enabled, mercadopago_access_token, mercadopago_public_key 
FROM companies 
WHERE id = 1;

-- 6. Verificar configuração do MySQL
SHOW VARIABLES LIKE 'sql_mode';

-- 7. Tentar desabilitar strict mode temporariamente (se necessário)
SET SESSION sql_mode=(SELECT REPLACE(@@sql_mode,'STRICT_TRANS_TABLES',''));

-- 8. Testar update completo
UPDATE companies 
SET mercadopago_enabled = 1,
    mercadopago_access_token = 'TEST-TOKEN',
    mercadopago_public_key = 'TEST-KEY'
WHERE id = 1;

-- 9. Verificar resultado final
SELECT id, mercadopago_enabled, mercadopago_access_token, mercadopago_public_key 
FROM companies 
WHERE id = 1;