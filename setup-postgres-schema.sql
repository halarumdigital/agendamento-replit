-- PostgreSQL Schema Setup for Business Management System
-- Drop existing tables if they exist to ensure clean setup
DROP TABLE IF EXISTS points_history CASCADE;
DROP TABLE IF EXISTS points_campaigns CASCADE;
DROP TABLE IF EXISTS client_points CASCADE;
DROP TABLE IF EXISTS task_reminders CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS review_invitations CASCADE;
DROP TABLE IF EXISTS professional_reviews CASCADE;
DROP TABLE IF EXISTS reminder_history CASCADE;
DROP TABLE IF EXISTS reminder_settings CASCADE;
DROP TABLE IF EXISTS birthday_message_history CASCADE;
DROP TABLE IF EXISTS birthday_messages CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS status CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS professionals CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS whatsapp_instances CASCADE;
DROP TABLE IF EXISTS global_settings CASCADE;
DROP TABLE IF EXISTS plans CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS admins CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;

-- Session storage table for express-session
CREATE TABLE sessions (
    sid VARCHAR(255) PRIMARY KEY,
    sess JSON NOT NULL,
    expire TIMESTAMP NOT NULL
);

CREATE INDEX IDX_session_expire ON sessions(expire);

-- Admin users table
CREATE TABLE admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Companies table
CREATE TABLE companies (
    id SERIAL PRIMARY KEY,
    fantasy_name VARCHAR(255) NOT NULL,
    document VARCHAR(20) NOT NULL UNIQUE,
    address TEXT NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    ai_agent_prompt TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subscription plans table
CREATE TABLE plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    free_days INTEGER NOT NULL DEFAULT 0,
    price DECIMAL(10, 2) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Global settings table
CREATE TABLE global_settings (
    id SERIAL PRIMARY KEY,
    system_name VARCHAR(255) NOT NULL DEFAULT 'AdminPro',
    logo_url VARCHAR(500),
    primary_color VARCHAR(7) NOT NULL DEFAULT '#2563eb',
    secondary_color VARCHAR(7) NOT NULL DEFAULT '#64748b',
    background_color VARCHAR(7) NOT NULL DEFAULT '#f8fafc',
    text_color VARCHAR(7) NOT NULL DEFAULT '#1e293b',
    evolution_api_url VARCHAR(500),
    evolution_api_global_key VARCHAR(500),
    openai_api_key VARCHAR(500),
    openai_model VARCHAR(100) NOT NULL DEFAULT 'gpt-4o',
    openai_temperature DECIMAL(3, 2) NOT NULL DEFAULT 0.70,
    openai_max_tokens INTEGER NOT NULL DEFAULT 4000,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- WhatsApp instances table
CREATE TABLE whatsapp_instances (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    instance_name VARCHAR(255) NOT NULL,
    status VARCHAR(50),
    qr_code TEXT,
    webhook VARCHAR(500),
    api_url VARCHAR(500),
    api_key VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Conversations table
CREATE TABLE conversations (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    whatsapp_instance_id INTEGER NOT NULL,
    phone_number VARCHAR(50) NOT NULL,
    contact_name VARCHAR(255),
    last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (whatsapp_instance_id) REFERENCES whatsapp_instances(id) ON DELETE CASCADE
);

CREATE INDEX idx_company_phone ON conversations(company_id, phone_number);
CREATE INDEX idx_whatsapp_instance ON conversations(whatsapp_instance_id);

-- Messages table
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    message_id VARCHAR(255),
    message_type VARCHAR(50),
    delivered BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE INDEX idx_conversation_id ON messages(conversation_id);
CREATE INDEX idx_timestamp ON messages(timestamp);

-- Services table
CREATE TABLE services (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    duration INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    points INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Professionals table
CREATE TABLE professionals (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    specialties TEXT[],
    work_days JSON,
    work_start_time VARCHAR(10),
    work_end_time VARCHAR(10),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Appointments table
CREATE TABLE appointments (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    professional_id INTEGER NOT NULL,
    service_id INTEGER NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    client_phone VARCHAR(50),
    client_email VARCHAR(255),
    appointment_date DATE NOT NULL,
    appointment_time VARCHAR(10) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'agendado',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (professional_id) REFERENCES professionals(id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
);

-- Status table
CREATE TABLE status (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Clients table
CREATE TABLE clients (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    birth_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Birthday messages table
CREATE TABLE birthday_messages (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Birthday message history table
CREATE TABLE birthday_message_history (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    client_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- Reminder settings table
CREATE TABLE reminder_settings (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    reminder_type VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    message_template TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Reminder history table
CREATE TABLE reminder_history (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    appointment_id INTEGER NOT NULL,
    reminder_type VARCHAR(50) NOT NULL,
    client_phone VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'sent',
    whatsapp_instance_id INTEGER,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
    FOREIGN KEY (whatsapp_instance_id) REFERENCES whatsapp_instances(id)
);

-- Professional reviews table
CREATE TABLE professional_reviews (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    professional_id INTEGER NOT NULL,
    appointment_id INTEGER NOT NULL,
    client_phone VARCHAR(50) NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    rating INTEGER NOT NULL,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (professional_id) REFERENCES professionals(id) ON DELETE CASCADE,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
);

-- Review invitations table
CREATE TABLE review_invitations (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    whatsapp_instance_id INTEGER,
    professional_id INTEGER NOT NULL,
    appointment_id INTEGER NOT NULL,
    client_phone VARCHAR(50) NOT NULL,
    invitation_token VARCHAR(255) NOT NULL UNIQUE,
    sent_at TIMESTAMP,
    review_submitted_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (professional_id) REFERENCES professionals(id) ON DELETE CASCADE,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
);

-- Tasks table
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    recurrence VARCHAR(50) DEFAULT 'none',
    whatsapp_number VARCHAR(50),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Task reminders table
CREATE TABLE task_reminders (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL,
    whatsapp_number VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- Client points table
CREATE TABLE client_points (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL,
    company_id INTEGER NOT NULL,
    total_points INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Points campaigns table
CREATE TABLE points_campaigns (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    required_points INTEGER NOT NULL,
    reward_service_id INTEGER NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (reward_service_id) REFERENCES services(id) ON DELETE CASCADE
);

-- Points history table
CREATE TABLE points_history (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    client_id INTEGER NOT NULL,
    points_change INTEGER NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- Insert default status values
INSERT INTO status (name, color) VALUES
('Agendado', '#3B82F6'),
('Confirmado', '#10B981'),
('Em andamento', '#F59E0B'),
('Concluído', '#059669'),
('Cancelado', '#EF4444'),
('Não compareceu', '#6B7280');

-- Insert default global settings
INSERT INTO global_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Add indexes for better performance
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_company ON appointments(company_id);
CREATE INDEX idx_professionals_company ON professionals(company_id);
CREATE INDEX idx_services_company ON services(company_id);
CREATE INDEX idx_clients_company ON clients(company_id);
CREATE INDEX idx_client_points_client ON client_points(client_id);
CREATE INDEX idx_client_points_company ON client_points(company_id);
CREATE INDEX idx_campaigns_company ON points_campaigns(company_id);
CREATE INDEX idx_points_history_client ON points_history(client_id);
CREATE INDEX idx_tasks_company ON tasks(company_id);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);