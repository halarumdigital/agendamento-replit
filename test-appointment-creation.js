import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function testAppointmentCreation() {
  const pool = mysql.createPool({
    host: '31.97.166.39',
    port: 3306,
    user: 'agenday_dev',
    password: 'n80bbV7sjLjD',
    database: 'agenday_dev',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  try {
    // Find recent conversation with SIM
    const [conversations] = await pool.execute(`
      SELECT c.id, c.phone_number, m.content, m.timestamp 
      FROM conversations c
      JOIN messages m ON c.id = m.conversation_id 
      WHERE c.company_id = 2 
        AND m.role = 'user' 
        AND (LOWER(m.content) LIKE '%sim%' OR LOWER(m.content) LIKE '%ok%')
        AND m.timestamp > DATE_SUB(NOW(), INTERVAL 24 HOUR)
      ORDER BY m.timestamp DESC 
      LIMIT 1
    `);

    if (conversations.length === 0) {
      console.log('❌ Nenhuma conversa com confirmação SIM encontrada');
      return;
    }

    const conversation = conversations[0];
    console.log('✅ Conversa encontrada:', conversation.id, 'Phone:', conversation.phone_number);

    // Get last AI message with appointment details
    const [messages] = await pool.execute(`
      SELECT content 
      FROM messages 
      WHERE conversation_id = ? 
        AND role = 'assistant'
        AND (content LIKE '%👤 Nome:%' OR content LIKE '%Nome:%')
      ORDER BY timestamp DESC 
      LIMIT 1
    `, [conversation.id]);

    if (messages.length === 0) {
      console.log('❌ Nenhuma mensagem de confirmação encontrada');
      return;
    }

    const aiMessage = messages[0].content;
    console.log('📝 Mensagem da IA:', aiMessage.substring(0, 200) + '...');

    // Extract appointment details
    const clientName = aiMessage.match(/(?:👤\s*)?Nome:\s*([^\n]+)/)?.[1]?.trim() || 'Cliente';
    const service = aiMessage.match(/(?:✅\s*)?Serviço:\s*([^\n]+)/)?.[1]?.trim() || 'Corte de cabelo';
    const professional = aiMessage.match(/(?:👨\s*)?Profissional:\s*([^\n]+)/)?.[1]?.trim() || 'Magnus';
    const dateMatch = aiMessage.match(/(?:📅\s*)?Data:\s*([^\n]+)/)?.[1]?.trim();
    const timeMatch = aiMessage.match(/(?:⏰\s*)?Horário:\s*([^\n]+)/)?.[1]?.trim();

    console.log('👤 Cliente:', clientName);
    console.log('✅ Serviço:', service);
    console.log('👨 Profissional:', professional);
    console.log('📅 Data:', dateMatch);
    console.log('⏰ Horário:', timeMatch);

    // Find service ID
    const [services] = await pool.execute(
      'SELECT id, price FROM services WHERE company_id = 2 AND name LIKE ? LIMIT 1',
      [`%${service}%`]
    );
    const serviceId = services[0]?.id || 14; // Default to "Serviço barato de 1 pila"
    const price = services[0]?.price || '60.00';

    // Find professional ID
    const [professionals] = await pool.execute(
      'SELECT id FROM professionals WHERE company_id = 2 AND name LIKE ? LIMIT 1',
      [`%${professional}%`]
    );
    const professionalId = professionals[0]?.id || 10; // Default to Magnus

    // Parse date
    const appointmentDate = new Date();
    appointmentDate.setDate(appointmentDate.getDate() + 1); // Tomorrow as default

    // Create appointment
    const [result] = await pool.execute(`
      INSERT INTO appointments (
        company_id, professional_id, service_id, client_name, client_phone,
        appointment_date, appointment_time, duration, total_price, status,
        notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      2, // company_id
      professionalId,
      serviceId,
      clientName,
      conversation.phone_number,
      appointmentDate,
      timeMatch || '15:00',
      30, // duration
      price,
      'Confirmado',
      `Agendamento via WhatsApp - Pagamento PIX aprovado - Conversa ID: ${conversation.id}`,
    ]);

    console.log('✅ Agendamento criado com sucesso! ID:', result.insertId);

    // Send confirmation via WhatsApp
    const [company] = await pool.execute(
      'SELECT evolution_api_url, evolution_api_key, whatsapp_instance_name FROM companies WHERE id = 2'
    );

    if (company[0]?.evolution_api_url && company[0]?.evolution_api_key) {
      const messageText = `✅ *Pagamento aprovado via PIX!*

Seu agendamento foi confirmado:

📋 *Detalhes do Agendamento*
👤 Nome: ${clientName}
✅ Serviço: ${service}
👨 Profissional: ${professional}
📅 Data: ${appointmentDate.toLocaleDateString('pt-BR')}
⏰ Horário: ${timeMatch || '15:00'}
💰 Valor: R$ ${price}

Obrigado pela preferência! 😊`;

      const evolutionUrl = company[0].evolution_api_url.replace(/\/$/, '');
      const response = await fetch(`${evolutionUrl}/message/sendText/${company[0].whatsapp_instance_name}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': company[0].evolution_api_key
        },
        body: JSON.stringify({
          number: conversation.phone_number,
          text: messageText
        })
      });

      if (response.ok) {
        console.log('✅ Mensagem de confirmação enviada via WhatsApp');
      } else {
        console.log('❌ Erro ao enviar mensagem:', response.status);
      }
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await pool.end();
  }
}

testAppointmentCreation();