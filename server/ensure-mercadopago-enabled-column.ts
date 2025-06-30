import { pool } from './db';

export async function ensureMercadopagoEnabledColumn() {
  try {
    console.log('🔧 Checking mercadopago_enabled column in companies table...');
    
    // Check if column already exists
    const [columns] = await pool.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'companies' 
      AND COLUMN_NAME = 'mercadopago_enabled'
    `);
    
    if ((columns as any[]).length === 0) {
      // Add the column
      await pool.execute(`
        ALTER TABLE companies 
        ADD COLUMN mercadopago_enabled INT NOT NULL DEFAULT 0
      `);
      console.log('✅ mercadopago_enabled column added successfully');
    } else {
      console.log('✅ mercadopago_enabled column already exists');
    }
    
  } catch (error) {
    console.error('❌ Error ensuring mercadopago_enabled column:', error);
  }
}