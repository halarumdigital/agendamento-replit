import { pool } from "./db";

export async function ensureAddressColumns() {
  try {
    const dbName = process.env.MYSQL_DATABASE || process.env.DB_NAME || process.env.DATABASE || process.env.PGDATABASE;
    if (!dbName) {
      throw new Error("Nenhuma variável de ambiente de nome de banco de dados está definida. Defina MYSQL_DATABASE, DB_NAME, DATABASE ou PGDATABASE no seu .env.");
    }
    console.log('✅ Checking address columns in companies table...');
    
    const columnsToAdd = ['phone', 'zip_code', 'number', 'neighborhood', 'city', 'state'];
    const columnDefinitions = {
      phone: 'VARCHAR(20) NULL',
      zip_code: 'VARCHAR(10) NULL',
      number: 'VARCHAR(10) NULL',
      neighborhood: 'VARCHAR(100) NULL',
      city: 'VARCHAR(100) NULL',
      state: 'VARCHAR(2) NULL'
    };

    for (const columnName of columnsToAdd) {
      try {
        const [columns] = await pool.execute(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'companies' 
          AND COLUMN_NAME = ?
        `, [dbName, columnName]);

        if ((columns as any[]).length === 0) {
          console.log(`Adding ${columnName} column to companies table...`);
          await pool.execute(`ALTER TABLE companies ADD COLUMN ${columnName} ${columnDefinitions[columnName as keyof typeof columnDefinitions]}`);
          console.log(`✅ ${columnName} column added successfully`);
        }
      } catch (error: any) {
        if (error.code !== 'ER_DUP_FIELDNAME') {
          console.error(`Error adding ${columnName} column:`, error);
        }
      }
    }
    
    console.log('✅ Address columns verification completed');
  } catch (error) {
    console.error('Error ensuring address columns:', error);
  }
}