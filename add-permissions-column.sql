-- Add permissions column to plans table
ALTER TABLE plans ADD COLUMN permissions JSON DEFAULT '{"dashboard": true, "appointments": true, "services": true, "professionals": true, "clients": true, "reviews": false, "tasks": false, "pointsProgram": false, "loyalty": false, "inventory": false, "messages": false, "coupons": false, "financial": false, "reports": false, "settings": true}';

-- Update existing plans with default permissions
UPDATE plans SET permissions = '{"dashboard": true, "appointments": true, "services": true, "professionals": true, "clients": true, "reviews": false, "tasks": false, "pointsProgram": false, "loyalty": false, "inventory": false, "messages": false, "coupons": false, "financial": false, "reports": false, "settings": true}' WHERE permissions IS NULL;