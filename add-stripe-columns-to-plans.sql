-- Add Stripe columns to plans table
ALTER TABLE plans 
ADD COLUMN stripe_product_id VARCHAR(255),
ADD COLUMN stripe_price_id VARCHAR(255);

-- Add unique indexes for Stripe IDs
CREATE INDEX idx_plans_stripe_product_id ON plans(stripe_product_id);
CREATE INDEX idx_plans_stripe_price_id ON plans(stripe_price_id);