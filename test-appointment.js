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
      
      // Calculate next Friday
      const appointmentDate = new Date();
      appointmentDate.setDate(appointmentDate.getDate() + (5 - appointmentDate.getDay() + 7) % 7);
      if (appointmentDate.getDay() === 5 && appointmentDate.getTime() <= Date.now()) {
        appointmentDate.setDate(appointmentDate.getDate() + 7); // Next Friday if today is Friday
      }
      
      const appointmentData = {
        company_id: 1,
        service_id: service.id,
        professional_id: professional.id,
        client_name: 'Jesse',
        client_phone: '554999214230',
        client_email: null,
        appointment_date: appointmentDate.toISOString().split('T')[0],
        appointment_time: '09:00',
        duration: service.duration || 60,
        status: 'Pendente',
        total_price: service.price || 0,
        notes: 'Teste direto - Jesse via WhatsApp',
        reminder_sent: false,
        created_at: new Date(),
        updated_at: new Date()
      };
      
      const [result] = await pool.execute(`
        INSERT INTO appointments (
          company_id, service_id, professional_id, client_name, client_phone, client_email,
          appointment_date, appointment_time, duration, status, total_price, notes, 
          reminder_sent, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        appointmentData.company_id, appointmentData.service_id, appointmentData.professional_id,
        appointmentData.client_name, appointmentData.client_phone, appointmentData.client_email,
        appointmentData.appointment_date, appointmentData.appointment_time, appointmentData.duration,
        appointmentData.status, appointmentData.total_price, appointmentData.notes,
        appointmentData.reminder_sent, appointmentData.created_at, appointmentData.updated_at
      ]);
      
      console.log('✅ Jesse appointment created with ID:', result.insertId);
      console.log('📅 Date:', appointmentData.appointment_date, 'Time:', appointmentData.appointment_time);
      console.log('👤 Professional:', professional.name, 'Service:', service.name);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

createTestAppointment();