import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from "@shared/schema";

// MySQL connection pool using credentials from .env
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export const db = drizzle(pool, { schema, mode: 'default' });

// Add missing columns if they don't exist
(async () => {
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
})();