import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function testConversationSearch() {
  console.log('🔍 Procurando mensagem de confirmação na conversa 111...');
  
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 10
  });
  
  try {
    // Get all messages from conversation 111
    const [messages] = await pool.execute(
      'SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp DESC LIMIT 50',
      [111]
    );
    
    console.log(`📝 Encontradas ${messages.length} mensagens na conversa 111`);
    
    // Look for confirmation patterns
    for (const msg of messages) {
      if (msg.role === 'assistant') {
        console.log(`\n📋 Mensagem da IA (${new Date(msg.timestamp).toLocaleString()}):`);
        console.log(`"${msg.content.substring(0, 200)}..."`);
        
        const hasName = msg.content.includes('👤 Nome:') || msg.content.includes('Nome:');
        const hasService = msg.content.includes('💇 Serviço:') || msg.content.includes('Serviço:');
        const hasDate = msg.content.includes('📅 Data:') || msg.content.includes('Data:');
        const hasTime = msg.content.includes('🕐 Horário:') || msg.content.includes('Horário:');
        const hasConfirmation = msg.content.includes('Está tudo correto') || msg.content.includes('Responda SIM');
        
        console.log(`  ✓ Tem nome: ${hasName}`);
        console.log(`  ✓ Tem serviço: ${hasService}`);
        console.log(`  ✓ Tem data: ${hasDate}`);
        console.log(`  ✓ Tem horário: ${hasTime}`);
        console.log(`  ✓ Tem confirmação: ${hasConfirmation}`);
        
        if (hasName && hasService && hasDate && hasTime) {
          console.log('🎯 ESTA É A MENSAGEM DE CONFIRMAÇÃO!');
          console.log('📋 Conteúdo completo:');
          console.log(msg.content);
          
          // Extract data
          const clientNameMatch = msg.content.match(/(?:👤\s*Nome|Nome):\s*([^,\n🏢💇📅🕐]+)/i);
          const serviceMatch = msg.content.match(/(?:💇\s*Serviço|Serviço):\s*([^,\n📅🕐\(R\$]+)/i);
          const dateMatch = msg.content.match(/(?:📅\s*Data|Data):\s*[^\d]*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4})/i);
          const timeMatch = msg.content.match(/(?:🕐\s*Horário|Horário):\s*([0-9]{1,2}:[0-9]{2})/i);
          
          console.log('\n📊 Dados extraídos:');
          console.log(`  Nome: ${clientNameMatch ? clientNameMatch[1].trim() : 'NÃO ENCONTRADO'}`);
          console.log(`  Serviço: ${serviceMatch ? serviceMatch[1].trim() : 'NÃO ENCONTRADO'}`);
          console.log(`  Data: ${dateMatch ? dateMatch[1] : 'NÃO ENCONTRADO'}`);
          console.log(`  Horário: ${timeMatch ? timeMatch[1] : 'NÃO ENCONTRADO'}`);
          
          break;
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await pool.end();
  }
}

testConversationSearch();