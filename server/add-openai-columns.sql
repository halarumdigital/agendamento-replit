-- Add OpenAI configuration columns to global_settings table
ALTER TABLE global_settings 
ADD COLUMN IF NOT EXISTS openai_api_key VARCHAR(500),
ADD COLUMN IF NOT EXISTS openai_model VARCHAR(100) DEFAULT 'gpt-4o',
ADD COLUMN IF NOT EXISTS openai_temperature DECIMAL(3,2) DEFAULT 0.70,
ADD COLUMN IF NOT EXISTS openai_max_tokens INT DEFAULT 4000;