import { db } from "./db";

export async function ensureTourEnabledColumn() {
  try {
    console.log('✅ Checking tour_enabled column in companies table...');
    
    // Check if tour_enabled column exists
    const result = await db.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'companies' 
      AND COLUMN_NAME = 'tour_enabled'
    `);
    
    const rows = (result as any)[0];
    if (!rows || rows.length === 0) {
      // Add tour_enabled column if it doesn't exist
      await db.execute(`
        ALTER TABLE companies 
        ADD COLUMN tour_enabled INT NOT NULL DEFAULT 1
      `);
      console.log('✅ tour_enabled column added to companies table');
    } else {
      console.log('✅ tour_enabled column already exists');
    }
  } catch (error) {
    console.error('Error ensuring tour_enabled column:', error);
    throw error;
  }
}