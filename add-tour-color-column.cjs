const mysql = require('mysql2/promise');
require('dotenv').config();

async function addTourColorColumn() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.PGHOST || 'localhost',
      user: process.env.PGUSER || 'root',
      password: process.env.PGPASSWORD || '',
      database: process.env.PGDATABASE || 'adminpro'
    });

    console.log('Connected to MySQL database');

    // Check if tour_color column exists
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'global_settings' 
      AND COLUMN_NAME = 'tour_color'
    `);

    if (columns.length === 0) {
      console.log('Adding tour_color column to global_settings table...');
      
      await connection.execute(`
        ALTER TABLE global_settings 
        ADD COLUMN tour_color VARCHAR(7) NOT NULL DEFAULT '#b845dc' AFTER text_color
      `);
      
      console.log('✅ tour_color column added successfully');
      
      // Update existing record with default value
      await connection.execute(`
        UPDATE global_settings 
        SET tour_color = '#b845dc' 
        WHERE id = 1 AND (tour_color IS NULL OR tour_color = '')
      `);
      
      console.log('✅ Default tour_color value set successfully');
    } else {
      console.log('✅ tour_color column already exists');
    }

  } catch (error) {
    console.error('❌ Error adding tour_color column:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

if (require.main === module) {
  addTourColorColumn()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = addTourColorColumn;