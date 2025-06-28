-- Migration: 006_communication_system.sql
-- Description: Sistema de comunicação WhatsApp e mensagens
-- Date: 2025-06-28

-- ================================================
-- INSTÂNCIAS WHATSAPP
-- ================================================

CREATE TABLE IF NOT EXISTS whatsapp_instances (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_id INT NOT NULL,
    instance_name VARCHAR(255) NOT NULL UNIQUE,
    instance_id VARCHAR(255),
    api_key VARCHAR(255),
    webhook_url VARCHAR(500),
    status ENUM('disconnected', 'connecting', 'connected', 'error') DEFAULT 'disconnected',
    qr_code TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_company (company_id),
    INDEX idx_status (status),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- ================================================
-- CAMPANHAS DE MENSAGEM
-- ================================================

CREATE TABLE IF NOT EXISTS message_campaigns (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    message_template TEXT NOT NULL,
    target_audience ENUM('all_clients', 'birthday', 'inactive', 'custom') DEFAULT 'all_clients',
    status ENUM('draft', 'active', 'paused', 'completed') DEFAULT 'draft',
    scheduled_date DATETIME,
    sent_count INT DEFAULT 0,
    total_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_company (company_id),
    INDEX idx_status (status),
    INDEX idx_scheduled (scheduled_date),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- ================================================
-- HISTÓRICO DE MENSAGENS
-- ================================================

CREATE TABLE IF NOT EXISTS message_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_id INT NOT NULL,
    campaign_id INT,
    client_phone VARCHAR(20) NOT NULL,
    client_name VARCHAR(255),
    message_content TEXT NOT NULL,
    status ENUM('pending', 'sent', 'delivered', 'failed') DEFAULT 'pending',
    sent_at TIMESTAMP NULL,
    delivered_at TIMESTAMP NULL,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_company (company_id),
    INDEX idx_campaign (campaign_id),
    INDEX idx_client_phone (client_phone),
    INDEX idx_status (status),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (campaign_id) REFERENCES message_campaigns(id) ON DELETE SET NULL
);

-- ================================================
-- CONVERSAS WHATSAPP
-- ================================================

CREATE TABLE IF NOT EXISTS whatsapp_conversations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_id INT NOT NULL,
    client_phone VARCHAR(20) NOT NULL,
    client_name VARCHAR(255),
    last_message TEXT,
    last_message_at TIMESTAMP,
    unread_count INT DEFAULT 0,
    status ENUM('open', 'closed', 'archived') DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_company (company_id),
    INDEX idx_client_phone (client_phone),
    INDEX idx_status (status),
    INDEX idx_last_message_at (last_message_at),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- ================================================
-- MENSAGENS WHATSAPP
-- ================================================

CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    conversation_id INT NOT NULL,
    message_id VARCHAR(255),
    sender_phone VARCHAR(20),
    sender_name VARCHAR(255),
    message_type ENUM('text', 'image', 'document', 'audio', 'video') DEFAULT 'text',
    message_content TEXT,
    media_url VARCHAR(500),
    is_from_client TINYINT(1) DEFAULT 1,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_conversation (conversation_id),
    INDEX idx_message_id (message_id),
    INDEX idx_timestamp (timestamp),
    FOREIGN KEY (conversation_id) REFERENCES whatsapp_conversations(id) ON DELETE CASCADE
);

-- Registrar esta migration
INSERT IGNORE INTO migrations (filename) VALUES ('006_communication_system.sql');