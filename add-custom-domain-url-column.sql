-- Add custom_domain_url column to global_settings table
ALTER TABLE global_settings ADD COLUMN custom_domain_url VARCHAR(500) AFTER custom_html;