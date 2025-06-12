const mysql = require('mysql2/promise');

async function testMySQLConnection() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'salon_db'
    });

    console.log('✅ Connected to MySQL successfully');

    // Check appointments table
    const [appointments] = await connection.execute('SELECT COUNT(*) as count FROM appointments');
    console.log('📊 Total appointments in MySQL:', appointments[0].count);

    // Check latest appointments
    const [latest] = await connection.execute(`
      SELECT id, client_name, appointment_date, appointment_time, status, notes 
      FROM appointments 
      ORDER BY created_at DESC 
      LIMIT 3
    `);
    console.log('📋 Latest appointments:', latest);

    // Test creating an appointment directly
    const testAppointment = await connection.execute(`
      INSERT INTO appointments 
      (company_id, professional_id, service_id, client_name, client_phone, appointment_date, appointment_time, duration, total_price, status, notes, created_at, updated_at)
      VALUES (1, 4, 1, 'Teste MySQL Direto', '554999214230', '2025-06-14', '16:00', 30, 25.00, 'agendado', 'Teste conexão direta MySQL', NOW(), NOW())
    `);
    
    console.log('✅ Test appointment created directly in MySQL:', testAppointment[0].insertId);

    await connection.end();
    console.log('✅ MySQL connection closed');

  } catch (error) {
    console.error('❌ MySQL connection error:', error);
  }
}

testMySQLConnection();