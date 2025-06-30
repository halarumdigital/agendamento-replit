import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function debugConversation111() {
  console.log('🔍 Analisando mensagens da conversa 111...');
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  
  try {
    const [messages] = await connection.execute(
      'SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp DESC LIMIT 20',
      [111]
    );
    
    console.log('📝 Mensagens da conversa 111:');
    for (const msg of messages) {
      console.log(`\n${msg.role}: "${msg.content}" (${new Date(msg.timestamp).toLocaleString()})`);
      
      if (msg.role === 'assistant') {
        console.log(`  ➡️ Contém "Responda SIM": ${msg.content.includes('Responda SIM para confirmar')}`);
        console.log(`  ➡️ Contém "Está tudo correto": ${msg.content.includes('Está tudo correto?')}`);
        
        // Check regex patterns
        const clientNameMatch = msg.content.match(/(?:cliente|nome):\s*([^,\n]+)/i);
        const serviceMatch = msg.content.match(/(?:serviço|service):\s*([^,\n]+)/i);
        const dateMatch = msg.content.match(/(?:data|date):\s*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4})/i);
        const timeMatch = msg.content.match(/(?:horário|hora|time):\s*([0-9]{1,2}:[0-9]{2})/i);
        
        if (clientNameMatch) console.log(`  📋 Nome: ${clientNameMatch[1].trim()}`);
        if (serviceMatch) console.log(`  📋 Serviço: ${serviceMatch[1].trim()}`);
        if (dateMatch) console.log(`  📋 Data: ${dateMatch[1]}`);
        if (timeMatch) console.log(`  📋 Horário: ${timeMatch[1]}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await connection.end();
  }
}

debugConversation111();