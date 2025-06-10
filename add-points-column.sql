-- Add points column to services table
ALTER TABLE services ADD COLUMN points INT DEFAULT 0 AFTER color;