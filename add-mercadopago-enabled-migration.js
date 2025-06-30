import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

async function addMercadopagoEnabledColumn() {
  const connection = await mysql.createConnection({
    host: '31.97.166.39',
    port: 3306,
    user: 'agenday_dev',
    password: 'Arcano12@',
    database: 'agenday_dev'
  });

  try {
    console.log('🔧 Adding mercadopago_enabled column to companies table...');
    
    // Check if column already exists
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'agenday_dev' 
      AND TABLE_NAME = 'companies' 
      AND COLUMN_NAME = 'mercadopago_enabled'
    `);
    
    if (columns.length === 0) {
      // Add the column
      await connection.execute(`
        ALTER TABLE companies 
        ADD COLUMN mercadopago_enabled INT NOT NULL DEFAULT 0
      `);
      console.log('✅ mercadopago_enabled column added successfully');
    } else {
      console.log('✅ mercadopago_enabled column already exists');
    }
    
  } catch (error) {
    console.error('❌ Error adding mercadopago_enabled column:', error);
  } finally {
    await connection.end();
  }
}

addMercadopagoEnabledColumn();