import { db } from "./db";

export async function ensureAddressColumns() {
  try {
    console.log('✅ Checking address columns in companies table...');
    
    // Check if columns exist
    const [columns] = await db.raw(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'companies' 
      AND COLUMN_NAME IN ('phone', 'zip_code', 'number', 'neighborhood', 'city', 'state')
    `, [process.env.PGDATABASE]);

    if (columns.length === 0) {
      console.log('Adding address columns to companies table...');
      
      await db.raw(`
        ALTER TABLE companies 
        ADD COLUMN phone VARCHAR(20) NULL,
        ADD COLUMN zip_code VARCHAR(10) NULL,
        ADD COLUMN number VARCHAR(10) NULL,
        ADD COLUMN neighborhood VARCHAR(100) NULL,
        ADD COLUMN city VARCHAR(100) NULL,
        ADD COLUMN state VARCHAR(2) NULL
      `);
      
      console.log('✅ Address columns added successfully');
    } else {
      console.log('✅ Address columns already exist');
    }
  } catch (error) {
    console.error('Error ensuring address columns:', error);
  }
}