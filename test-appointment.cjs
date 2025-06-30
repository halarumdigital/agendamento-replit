const mysql = require('mysql2/promise');
require('dotenv').config();

async function createTestAppointment() {
  console.log('🧪 Criando agendamento de teste com serviceId 10...');
  
  const pool = mysql.createPool({
    host: '31.97.166.39',
    port: 3306,
    user: 'agenday_dev',
    password: 'dev_agenday_2024',
    database: 'agenday_dev',
    connectionLimit: 10
  });
  
  try {
    // Check if service ID 10 exists
    const [services] = await pool.execute(
      'SELECT * FROM services WHERE id = ? AND company_id = ?',
      [10, 1]
    );
    
    if (services.length === 0) {
      console.log('❌ Serviço com ID 10 não encontrado na empresa 1');
      
      // Show available services
      const [allServices] = await pool.execute(
        'SELECT id, name, price FROM services WHERE company_id = ?',
        [1]
      );
      console.log('📋 Serviços disponíveis na empresa 1:');
      allServices.forEach(service => {
        console.log(`  - ID ${service.id}: ${service.name} (R$ ${service.price})`);
      });
      
      await pool.end();
      return;
    }
    
    const service = services[0];
    console.log(`✅ Serviço encontrado: ${service.name} (R$ ${service.price})`);
    
    // Create test appointment
    const appointmentData = {
      companyId: 1,
      professionalId: 1, // Magnus
      serviceId: 10,
      clientName: 'Frodo Bolseiro',
      clientPhone: '554999214230',
      appointmentDate: new Date('2025-01-15'),
      appointmentTime: '14:00',
      duration: 60,
      status: 'Confirmado',
      totalPrice: service.price,
      notes: 'Agendamento criado via webhook Mercado Pago',
      reminderSent: 0
    };
    
    const [result] = await pool.execute(
      `INSERT INTO appointments (
        company_id, professional_id, service_id, client_name, client_phone,
        appointment_date, appointment_time, duration, status, total_price, notes, reminder_sent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        appointmentData.companyId,
        appointmentData.professionalId,
        appointmentData.serviceId,
        appointmentData.clientName,
        appointmentData.clientPhone,
        appointmentData.appointmentDate,
        appointmentData.appointmentTime,
        appointmentData.duration,
        appointmentData.status,
        appointmentData.totalPrice,
        appointmentData.notes,
        appointmentData.reminderSent
      ]
    );
    
    console.log(`✅ Agendamento criado com sucesso! ID: ${result.insertId}`);
    console.log('📋 Detalhes do agendamento:');
    console.log(`  Cliente: ${appointmentData.clientName}`);
    console.log(`  Telefone: ${appointmentData.clientPhone}`);
    console.log(`  Serviço: ${service.name}`);
    console.log(`  Data: ${appointmentData.appointmentDate.toLocaleDateString('pt-BR')}`);
    console.log(`  Horário: ${appointmentData.appointmentTime}`);
    console.log(`  Valor: R$ ${appointmentData.totalPrice}`);
    console.log(`  Status: ${appointmentData.status}`);
    
  } catch (error) {
    console.error('❌ Erro ao criar agendamento:', error);
  } finally {
    await pool.end();
  }
}

createTestAppointment();