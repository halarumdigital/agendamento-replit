-- Add new address fields to companies table
ALTER TABLE companies 
ADD COLUMN phone VARCHAR(20) AFTER address,
ADD COLUMN zip_code VARCHAR(10) AFTER phone,
ADD COLUMN number VARCHAR(20) AFTER zip_code,
ADD COLUMN neighborhood VARCHAR(255) AFTER number,
ADD COLUMN city VARCHAR(255) AFTER neighborhood,
ADD COLUMN state VARCHAR(2) AFTER city;