CREATE TABLE IF NOT EXISTS coupons (
  id INT PRIMARY KEY AUTO_INCREMENT,
  company_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  description TEXT,
  discount_type ENUM('fixed', 'percentage') NOT NULL,
  discount_value DECIMAL(10,2) NOT NULL,
  min_order_value DECIMAL(10,2) DEFAULT 0,
  max_discount DECIMAL(10,2) DEFAULT NULL,
  usage_limit INT DEFAULT NULL,
  used_count INT DEFAULT 0,
  valid_until DATE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  UNIQUE KEY unique_company_code (company_id, code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;