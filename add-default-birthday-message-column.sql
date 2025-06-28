-- Add default birthday message column to global_settings table
ALTER TABLE global_settings ADD COLUMN default_birthday_message TEXT DEFAULT NULL;