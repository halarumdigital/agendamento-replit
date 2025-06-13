-- Add subscription-related columns to companies table
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS asaas_customer_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS asaas_subscription_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS subscription_next_due_date DATE,
ADD COLUMN IF NOT EXISTS trial_ends_at DATE;