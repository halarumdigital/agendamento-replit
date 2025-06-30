import mysql from 'mysql2/promise';

async function updateAppointmentService() {
  const connection = await mysql.createConnection({
    host: '31.97.166.39',
    port: 3306,
    user: 'agenday_dev',
    password: 'agenday_dev2025',
    database: 'agenday_dev'
  });

  try {
    // Update appointment 130 to use service ID 14 which exists
    const [result] = await connection.execute(
      'UPDATE appointments SET service_id = 14 WHERE id = 130'
    );
    
    console.log('✅ Updated appointment 130 to use service ID 14');
    console.log('Rows affected:', result.affectedRows);
    
    // Verify the update
    const [rows] = await connection.execute(
      'SELECT id, service_id, client_name, client_phone, created_at FROM appointments WHERE id = 130'
    );
    
    console.log('📋 Updated appointment:', rows[0]);
    
  } catch (error) {
    console.error('❌ Error updating appointment:', error);
  } finally {
    await connection.end();
  }
}

updateAppointmentService();