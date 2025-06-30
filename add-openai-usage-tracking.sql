-- Criar tabela para rastrear uso da OpenAI
CREATE TABLE IF NOT EXISTS openai_usage (
  id INT AUTO_INCREMENT PRIMARY KEY,
  request_date DATETIME NOT NULL,
  model VARCHAR(100) NOT NULL,
  prompt_tokens INT NOT NULL DEFAULT 0,
  completion_tokens INT NOT NULL DEFAULT 0,
  total_tokens INT NOT NULL DEFAULT 0,
  cost_estimate DECIMAL(10, 6) NOT NULL DEFAULT 0.000000,
  request_type VARCHAR(50) NOT NULL DEFAULT 'chat',
  company_id INT NULL,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  INDEX idx_request_date (request_date),
  INDEX idx_company_id (company_id),
  INDEX idx_model (model)
);