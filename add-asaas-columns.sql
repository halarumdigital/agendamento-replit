-- Add Asaas integration columns to companies table
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS asaas_customer_id VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS asaas_payment_id VARCHAR(255) NULL;

-- Add index for better performance on Asaas lookups
CREATE INDEX IF NOT EXISTS idx_companies_asaas_customer ON companies(asaas_customer_id);
CREATE INDEX IF NOT EXISTS idx_companies_asaas_payment ON companies(asaas_payment_id);