-- Add custom_html column to global_settings table
ALTER TABLE global_settings ADD COLUMN custom_html TEXT AFTER smtp_secure;