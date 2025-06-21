import { pool } from "./db";

export async function ensureSupportTables() {
  try {
    console.log("✅ Checking and ensuring support tables...");
    
    // Create support_ticket_types table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS support_ticket_types (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    // Create support_tickets table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id INT NOT NULL,
        type_id INT,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'open',
        priority VARCHAR(50) DEFAULT 'medium',
        category VARCHAR(100),
        admin_response TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP NULL,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
        FOREIGN KEY (type_id) REFERENCES support_ticket_types(id) ON DELETE SET NULL
      )
    `);
    
    // Insert default ticket types if they don't exist
    await pool.execute(`
      INSERT IGNORE INTO support_ticket_types (name, description, is_active) VALUES
      ('Técnico', 'Problemas técnicos e bugs do sistema', TRUE),
      ('Financeiro', 'Questões relacionadas a pagamentos e cobrança', TRUE),
      ('Funcionalidade', 'Solicitações de novas funcionalidades', TRUE),
      ('Geral', 'Dúvidas e suporte geral', TRUE)
    `);
    
    console.log("✅ Support tables verified and initialized");
  } catch (error) {
    console.error("Error ensuring support tables:", error);
    throw error;
  }
}