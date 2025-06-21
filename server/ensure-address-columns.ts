import { pool } from "./db";

export async function ensureAddressColumns() {
  try {
    console.log('✅ Checking address columns in companies table...');
    
    const columnsToAdd = ['phone', 'zip_code', 'number', 'neighborhood', 'city', 'state'];
    const columnDefinitions = {
      phone: 'VARCHAR(20)',
      zip_code: 'VARCHAR(10)', 
      number: 'VARCHAR(10)',
      neighborhood: 'VARCHAR(100)',
      city: 'VARCHAR(100)',
      state: 'VARCHAR(2)'
    };

    for (const columnName of columnsToAdd) {
      try {
        const result = await pool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'companies' 
          AND column_name = $1
        `, [columnName]);

        if (result.rows.length === 0) {
          console.log(`Adding ${columnName} column to companies table...`);
          await pool.query(`ALTER TABLE companies ADD COLUMN ${columnName} ${columnDefinitions[columnName as keyof typeof columnDefinitions]}`);
          console.log(`✅ ${columnName} column added successfully`);
        }
      } catch (error: any) {
        if (error.code !== '42701') { // PostgreSQL duplicate column error code
          console.error(`Error adding ${columnName} column:`, error);
        }
      }
    }
    
    console.log('✅ Address columns verification completed');
  } catch (error) {
    console.error('Error ensuring address columns:', error);
  }
}