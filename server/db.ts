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

// Add missing ai_agent_prompt column if it doesn't exist
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
})();