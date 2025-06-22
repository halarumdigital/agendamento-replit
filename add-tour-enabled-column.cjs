const mysql = require('mysql2/promise');

async function addTourEnabledColumn() {
  const connection = await mysql.createConnection({
    host: '69.62.101.23',
    user: 'gilliard_salao',
    password: 'Sa@260820',
    database: 'gilliard_salao'
  });

  try {
    console.log('Adding tour_enabled column to companies table...');
    
    await connection.execute(`
      ALTER TABLE companies 
      ADD COLUMN tour_enabled INT NOT NULL DEFAULT 1
    `);
    
    console.log('✅ tour_enabled column added successfully');
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('✅ tour_enabled column already exists');
    } else {
      console.error('Error adding tour_enabled column:', error);
      throw error;
    }
  } finally {
    await connection.end();
  }
}

if (require.main === module) {
  addTourEnabledColumn().catch(console.error);
}

module.exports = addTourEnabledColumn;