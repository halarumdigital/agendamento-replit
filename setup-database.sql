-- Script para configurar o banco de dados MySQL
-- Execute este script no seu MySQL para criar o banco e as tabelas

CREATE DATABASE IF NOT EXISTS admin_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE admin_system;

-- Tabela de sessões para autenticação
CREATE TABLE IF NOT EXISTS sessions (
  sid VARCHAR(255) PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP NOT NULL,
  INDEX IDX_session_expire (expire)
);

-- Tabela de administradores
CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabela de empresas
CREATE TABLE IF NOT EXISTS companies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fantasy_name VARCHAR(255) NOT NULL,
  document VARCHAR(20) NOT NULL UNIQUE,
  address TEXT NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabela de planos de assinatura
CREATE TABLE IF NOT EXISTS plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  free_days INT NOT NULL DEFAULT 0,
  price DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabela de configurações globais
CREATE TABLE IF NOT EXISTS global_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  system_name VARCHAR(255) NOT NULL DEFAULT 'AdminPro',
  logo_url VARCHAR(500),
  primary_color VARCHAR(7) NOT NULL DEFAULT '#2563eb',
  secondary_color VARCHAR(7) NOT NULL DEFAULT '#64748b',
  background_color VARCHAR(7) NOT NULL DEFAULT '#f8fafc',
  text_color VARCHAR(7) NOT NULL DEFAULT '#1e293b',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Inserir configurações padrão
INSERT IGNORE INTO global_settings (id, system_name) VALUES (1, 'AdminPro');

-- Criar usuário administrador padrão (opcional)
-- A senha é 'admin123' com hash bcrypt
INSERT IGNORE INTO admins (username, email, password, first_name, last_name) 
VALUES ('admin', 'admin@sistema.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBdXwGVkxnOtZy', 'Administrador', 'Sistema');