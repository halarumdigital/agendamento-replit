-- Add SMTP configuration columns to global_settings table
ALTER TABLE global_settings 
ADD COLUMN smtp_host VARCHAR(255),
ADD COLUMN smtp_port VARCHAR(10),
ADD COLUMN smtp_user VARCHAR(255),
ADD COLUMN smtp_password VARCHAR(255),
ADD COLUMN smtp_from_email VARCHAR(255),
ADD COLUMN smtp_from_name VARCHAR(255),
ADD COLUMN smtp_secure BOOLEAN DEFAULT TRUE;