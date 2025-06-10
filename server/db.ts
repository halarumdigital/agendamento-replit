import mysql, { PoolOptions } from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from "@shared/schema";

// Check if MySQL credentials are provided
const requiredEnvVars = ['MYSQL_HOST', 'MYSQL_USER', 'MYSQL_PASSWORD', 'MYSQL_DATABASE'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.log('⚠️  Missing MySQL environment variables:', missingEnvVars.join(', '));
  console.log('📝 Please configure your MySQL credentials in the .env file');
}

// MySQL connection pool using credentials from .env
const poolConfig: PoolOptions = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || '',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || '',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

const pool = mysql.createPool(poolConfig);

export const db = drizzle(pool, { schema, mode: 'default' });

// Database initialization function
async function initializeDatabase() {
  // Skip database operations if credentials are missing
  if (missingEnvVars.length > 0) {
    console.log('⏭️  Skipping database initialization due to missing credentials');
    return;
  }

  try {
    // Test database connection
    await pool.execute('SELECT 1');
    console.log('✅ MySQL connection established');

    // Add missing columns if they don't exist
    try {
      await pool.execute(`
        SELECT ai_agent_prompt FROM companies LIMIT 1
      `);
    } catch (error: any) {
      if (error.code === 'ER_BAD_FIELD_ERROR') {
        try {
          await pool.execute(`
            ALTER TABLE companies 
            ADD COLUMN ai_agent_prompt TEXT NULL
          `);
          console.log('✅ AI agent prompt column added successfully');
        } catch (alterError) {
          console.error('❌ Error adding AI agent column:', alterError);
        }
      }
    }

    // Add WhatsApp instance API fields
    try {
      await pool.execute(`
        SELECT api_url, api_key FROM whatsapp_instances LIMIT 1
      `);
    } catch (error: any) {
      if (error.code === 'ER_BAD_FIELD_ERROR') {
        try {
          await pool.execute(`
            ALTER TABLE whatsapp_instances 
            ADD COLUMN api_url VARCHAR(500) NULL,
            ADD COLUMN api_key VARCHAR(500) NULL
          `);
          console.log('✅ WhatsApp API fields added successfully');
        } catch (alterError) {
          console.error('❌ Error adding WhatsApp API fields:', alterError);
        }
      }
    }

    // Create reminder_settings table
    try {
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS reminder_settings (
          id INT AUTO_INCREMENT PRIMARY KEY,
          company_id INT NOT NULL,
          reminder_type VARCHAR(50) NOT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          message_template TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
        )
      `);
      console.log('✅ Reminder settings table created/verified');
    } catch (error) {
      console.error('❌ Error creating reminder_settings table:', error);
    }

    // Create reminder_history table
    try {
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS reminder_history (
          id INT AUTO_INCREMENT PRIMARY KEY,
          company_id INT NOT NULL,
          appointment_id INT NOT NULL,
          reminder_type VARCHAR(50) NOT NULL,
          client_phone VARCHAR(20) NOT NULL,
          message TEXT NOT NULL,
          sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          status VARCHAR(20) DEFAULT 'sent',
          whatsapp_instance_id INT,
          FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
          FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
          FOREIGN KEY (whatsapp_instance_id) REFERENCES whatsapp_instances(id)
        )
      `);
      console.log('✅ Reminder history table created/verified');
    } catch (error) {
      console.error('❌ Error creating reminder_history table:', error);
    }

    // Insert default reminder templates for existing companies
    try {
      const [companies] = await pool.execute('SELECT id FROM companies');
      
      for (const company of companies as any[]) {
        // Check if reminder settings already exist
        const [existing] = await pool.execute(
          'SELECT id FROM reminder_settings WHERE company_id = ?',
          [company.id]
        );

        if ((existing as any[]).length === 0) {
          // Insert default reminder templates
          const reminderTemplates = [
            {
              type: 'confirmation',
              template: '*Agendamento Confirmado!*\n\n*{companyName}*\n*Servico:* {serviceName}\n*Profissional:* {professionalName}\n*Data e Hora:* {appointmentDate} as {appointmentTime}\n\nObrigado por escolher nossos servicos!'
            },
            {
              type: '24h',
              template: '*Lembrete de Agendamento*\n\n*{companyName}*\n*Servico:* {serviceName}\n*Profissional:* {professionalName}\n*Data e Hora:* {appointmentDate} as {appointmentTime}\n\n*Seu agendamento e amanha!*\nNos vemos em breve!'
            },
            {
              type: '1h',
              template: '*Lembrete Final*\n\n*{companyName}*\n*Servico:* {serviceName}\n*Profissional:* {professionalName}\n*Data e Hora:* {appointmentDate} as {appointmentTime}\n\n*Seu agendamento e em 1 hora!*\nEstamos te esperando!'
            }
          ];

          for (const reminder of reminderTemplates) {
            await pool.execute(
              'INSERT INTO reminder_settings (company_id, reminder_type, message_template) VALUES (?, ?, ?)',
              [company.id, reminder.type, reminder.template]
            );
          }
        }
      }
      console.log('✅ Default reminder templates verified for all companies');
    } catch (error) {
      console.error('❌ Error setting up default reminder templates:', error);
    }

    // Create clients table if it doesn't exist
    try {
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS clients (
          id INT AUTO_INCREMENT PRIMARY KEY,
          company_id INT NOT NULL,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NULL,
          phone VARCHAR(50) NULL,
          birth_date DATE NULL,
          notes TEXT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
          INDEX idx_company_id (company_id),
          INDEX idx_name (name),
          INDEX idx_email (email)
        )
      `);
      console.log('✅ Clients table ready');
    } catch (error) {
      console.error('❌ Error creating clients table:', error);
    }

  } catch (error: any) {
    console.error('❌ Database connection failed:', error.message);
    console.log('📝 Please check your MySQL credentials and ensure the database server is running');
  }
}

// Initialize database
initializeDatabase();