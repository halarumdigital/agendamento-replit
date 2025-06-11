-- Add max_professionals column to plans table
ALTER TABLE plans ADD COLUMN max_professionals INT NOT NULL DEFAULT 1;

-- Update existing plans with a default value
UPDATE plans SET max_professionals = 
  CASE 
    WHEN name LIKE '%básico%' OR name LIKE '%basic%' THEN 1
    WHEN name LIKE '%premium%' OR name LIKE '%profissional%' THEN 5
    WHEN name LIKE '%enterprise%' OR name LIKE '%empresarial%' THEN 10
    ELSE 3
  END;