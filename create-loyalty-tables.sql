CREATE TABLE IF NOT EXISTS loyalty_campaigns (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  condition_type VARCHAR(50) NOT NULL,
  condition_value INT NOT NULL,
  reward_type VARCHAR(50) NOT NULL,
  reward_value INT NOT NULL,
  reward_service_id INT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (reward_service_id) REFERENCES services(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS loyalty_rewards_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  client_id INT NOT NULL,
  campaign_id INT NOT NULL,
  reward_type VARCHAR(50) NOT NULL,
  reward_value VARCHAR(255) NOT NULL,
  used_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (campaign_id) REFERENCES loyalty_campaigns(id) ON DELETE CASCADE
);
