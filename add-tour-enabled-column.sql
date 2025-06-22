-- Add tour_enabled column to companies table
ALTER TABLE companies ADD COLUMN tour_enabled INT NOT NULL DEFAULT 1;