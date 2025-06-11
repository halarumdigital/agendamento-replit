-- Add SMTP configuration columns to global_settings table
ALTER TABLE global_settings 
ADD COLUMN smtp_host VARCHAR(255) NULL AFTER openai_max_tokens,
ADD COLUMN smtp_port INT DEFAULT 587 AFTER smtp_host,
ADD COLUMN smtp_user VARCHAR(255) NULL AFTER smtp_port,
ADD COLUMN smtp_password VARCHAR(255) NULL AFTER smtp_user,
ADD COLUMN smtp_from VARCHAR(255) NULL AFTER smtp_password,
ADD COLUMN smtp_from_name VARCHAR(255) NULL AFTER smtp_from;