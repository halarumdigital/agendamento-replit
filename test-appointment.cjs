// Quick test to create appointment directly for Jesse
const mysql = require('mysql2/promise');

async function createTestAppointment() {
  const pool = mysql.createPool({
    host: '31.97.166.39',
    port: 3306,
    user: 'agenday_dev',
    password: 'agenday2024',
    database: 'agenday_dev',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  try {
    // Get the professional ID for Silva and a service
    const [professionals] = await pool.execute('SELECT * FROM professionals WHERE company_id = 1 AND name = "Silva"');
    const [services] = await pool.execute('SELECT * FROM services WHERE company_id = 1 LIMIT 1');
    
    if (professionals.length > 0 && services.length > 0) {
      const professional = professionals[0];
      const service = services[0];
      
      // Calculate next Friday (July 4, 2025)
      const appointmentDate = new Date('2025-07-04');
      
      const [result] = await pool.execute(`
        INSERT INTO appointments (
          company_id, service_id, professional_id, client_name, client_phone, client_email,
          appointment_date, appointment_time, duration, status, total_price, notes, 
          reminder_sent, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        1, service.id, professional.id,
        'Jesse', '554999214230', null,
        appointmentDate.toISOString().split('T')[0], '09:00', service.duration || 60,
        'Pendente', service.price || 0, 'Teste direto - Jesse via WhatsApp',
        0, new Date(), new Date()
      ]);
      
      console.log('✅ Jesse appointment created with ID:', result.insertId);
      console.log('📅 Date: 2025-07-04 Time: 09:00');
      console.log('👤 Professional:', professional.name, 'Service:', service.name);
    } else {
      console.log('❌ No professionals or services found');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

createTestAppointment();