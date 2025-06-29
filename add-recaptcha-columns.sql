-- Add Google reCAPTCHA configuration columns to global_settings table
ALTER TABLE global_settings 
ADD COLUMN recaptcha_site_key VARCHAR(500),
ADD COLUMN recaptcha_secret_key VARCHAR(500);