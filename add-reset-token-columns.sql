-- Add reset token columns to companies table
ALTER TABLE companies 
ADD COLUMN reset_token VARCHAR(255),
ADD COLUMN reset_token_expires TIMESTAMP;