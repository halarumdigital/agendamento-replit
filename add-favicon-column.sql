-- Add favicon_url column to global_settings table
ALTER TABLE global_settings ADD COLUMN favicon_url VARCHAR(500) AFTER logo_url;