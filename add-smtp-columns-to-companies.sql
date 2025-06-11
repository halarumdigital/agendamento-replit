-- Add SMTP configuration columns to companies table
ALTER TABLE companies 
ADD COLUMN smtp_host VARCHAR(255),
ADD COLUMN smtp_port INT,
ADD COLUMN smtp_user VARCHAR(255),
ADD COLUMN smtp_password VARCHAR(255),
ADD COLUMN smtp_secure VARCHAR(10);