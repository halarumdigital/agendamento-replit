-- Add missing columns to appointments table
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS duration INT DEFAULT 30,
ADD COLUMN IF NOT EXISTS total_price DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE;

-- Add missing column to birthday_messages table  
ALTER TABLE birthday_messages 
ADD COLUMN IF NOT EXISTS message_template TEXT;