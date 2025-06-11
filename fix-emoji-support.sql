-- Fix emoji support by converting table to utf8mb4
ALTER TABLE message_campaigns CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;