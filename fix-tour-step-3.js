import mysql from 'mysql2/promise';

async function fixTourStep3() {
  const connection = await mysql.createConnection({
    host: process.env.PGHOST,
    port: process.env.PGPORT,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE
  });

  try {
    console.log('🔧 Fixing tour step 3 target element...');
    
    // Update step 3 to point to the correct services menu link
    await connection.execute(
      'UPDATE tour_steps SET targetElement = ? WHERE stepOrder = 3',
      ['[href="/company/services"]']
    );
    
    console.log('✅ Tour step 3 updated successfully');
    
    // Verify the update
    const [rows] = await connection.execute(
      'SELECT id, title, targetElement, stepOrder FROM tour_steps WHERE stepOrder = 3'
    );
    
    console.log('📝 Updated step:', rows[0]);
    
  } catch (error) {
    console.error('❌ Error fixing tour step:', error);
  } finally {
    await connection.end();
  }
}

fixTourStep3();