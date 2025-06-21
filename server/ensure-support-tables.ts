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
    
    // Create support_ticket_statuses table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS support_ticket_statuses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        color VARCHAR(7) DEFAULT '#6b7280',
        is_active BOOLEAN DEFAULT TRUE,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    // Check if support_tickets table exists and handle migration
    const [tableCheck] = await pool.execute(`
      SELECT COUNT(*) as table_exists 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() AND table_name = 'support_tickets'
    `) as any;
    
    if (tableCheck[0]?.table_exists > 0) {
      // Table exists, check if it has the correct columns
      const [statusIdCheck] = await pool.execute(`
        SELECT COUNT(*) as column_exists 
        FROM information_schema.columns 
        WHERE table_schema = DATABASE() 
        AND table_name = 'support_tickets' 
        AND column_name = 'status_id'
      `) as any;
      
      if (statusIdCheck[0]?.column_exists === 0) {
        // Add status_id column if it doesn't exist
        await pool.execute(`ALTER TABLE support_tickets ADD COLUMN status_id INT`);
        
        // Check if old status column exists and migrate data
        const [oldStatusCheck] = await pool.execute(`
          SELECT COUNT(*) as column_exists 
          FROM information_schema.columns 
          WHERE table_schema = DATABASE() 
          AND table_name = 'support_tickets' 
          AND column_name = 'status'
        `) as any;
        
        if (oldStatusCheck[0]?.column_exists > 0) {
          // Migrate data from old status column to status_id by mapping string values to IDs
          await pool.execute(`
            UPDATE support_tickets st
            LEFT JOIN support_ticket_statuses sts ON (
              (st.status = 'open' AND sts.name = 'Aberto') OR
              (st.status = 'in_progress' AND sts.name = 'Em Andamento') OR
              (st.status = 'resolved' AND sts.name = 'Resolvido') OR
              (st.status = 'closed' AND sts.name = 'Fechado')
            )
            SET st.status_id = sts.id
            WHERE st.status_id IS NULL AND sts.id IS NOT NULL
          `);
          
          // Drop the old status column
          await pool.execute(`ALTER TABLE support_tickets DROP COLUMN status`);
        }
        
        // Add foreign key constraint
        await pool.execute(`
          ALTER TABLE support_tickets 
          ADD FOREIGN KEY (status_id) REFERENCES support_ticket_statuses(id) ON DELETE SET NULL
        `);
      }
    } else {
      // Create support_tickets table with correct structure
      await pool.execute(`
        CREATE TABLE support_tickets (
          id INT AUTO_INCREMENT PRIMARY KEY,
          company_id INT NOT NULL,
          type_id INT,
          status_id INT,
          title VARCHAR(255) NOT NULL,
          description TEXT NOT NULL,
          priority VARCHAR(50) DEFAULT 'medium',
          category VARCHAR(100),
          admin_response TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          resolved_at TIMESTAMP NULL,
          FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
          FOREIGN KEY (type_id) REFERENCES support_ticket_types(id) ON DELETE SET NULL,
          FOREIGN KEY (status_id) REFERENCES support_ticket_statuses(id) ON DELETE SET NULL
        )
      `);
    }
    
    // Insert default ticket types if they don't exist
    await pool.execute(`
      INSERT IGNORE INTO support_ticket_types (name, description, is_active) VALUES
      ('Técnico', 'Problemas técnicos e bugs do sistema', TRUE),
      ('Financeiro', 'Questões relacionadas a pagamentos e cobrança', TRUE),
      ('Funcionalidade', 'Solicitações de novas funcionalidades', TRUE),
      ('Geral', 'Dúvidas e suporte geral', TRUE)
    `);
    
    // Insert default ticket statuses if they don't exist
    await pool.execute(`
      INSERT IGNORE INTO support_ticket_statuses (name, description, color, is_active, sort_order) VALUES
      ('Aberto', 'Ticket recém-criado', '#ef4444', TRUE, 1),
      ('Em Análise', 'Ticket sendo analisado pela equipe', '#f59e0b', TRUE, 2),
      ('Em Andamento', 'Ticket sendo trabalhado', '#3b82f6', TRUE, 3),
      ('Aguardando Cliente', 'Aguardando resposta do cliente', '#8b5cf6', TRUE, 4),
      ('Resolvido', 'Ticket resolvido com sucesso', '#10b981', TRUE, 5),
      ('Fechado', 'Ticket finalizado', '#6b7280', TRUE, 6)
    `);
    
    console.log("✅ Support tables verified and initialized");
  } catch (error) {
    console.error("Error ensuring support tables:", error);
    throw error;
  }
}