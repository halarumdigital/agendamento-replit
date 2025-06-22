import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.DB_HOST || '69.62.101.23',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'gilliard_salao',
  password: process.env.DB_PASSWORD || 'g1ll14rd2024*',
  database: process.env.DB_NAME || 'gilliard_salao'
};

async function addTourEnabledColumn() {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    // Check if column exists
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'companies' AND COLUMN_NAME = 'tour_enabled'
    `, [dbConfig.database]);
    
    if (columns.length === 0) {
      console.log('Adding tour_enabled column to companies table...');
      await connection.execute(`
        ALTER TABLE companies 
        ADD COLUMN tour_enabled BOOLEAN DEFAULT TRUE
      `);
      console.log('✅ tour_enabled column added successfully');
    } else {
      console.log('✅ tour_enabled column already exists');
    }
    
  } catch (error) {
    console.error('Error adding tour_enabled column:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

addTourEnabledColumn()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });