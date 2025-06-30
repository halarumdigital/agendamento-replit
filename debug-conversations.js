import mysql from 'mysql2/promise';

async function debugConversations() {
  const connection = await mysql.createConnection({
    host: '31.97.166.39',
    port: 3306,
    user: 'agenday_dev',
    password: 'n80bbV7sjLjD', 
    database: 'agenday_dev'
  });

  console.log('🔍 Verificando tabelas disponíveis...');
  
  const [tables] = await connection.execute('SHOW TABLES LIKE "%conversation%"');
  console.log('📋 Tabelas encontradas:', tables);
  
  const [allTables] = await connection.execute('SHOW TABLES');
  console.log('📋 Todas as tabelas:', allTables.map(t => Object.values(t)[0]));
  
  // Try different table names
  let conversationTable = null;
  const possibleNames = ['conversation', 'conversations', 'whatsapp_conversations'];
  
  for (const tableName of possibleNames) {
    try {
      const [test] = await connection.execute(`SELECT COUNT(*) as count FROM ${tableName} LIMIT 1`);
      conversationTable = tableName;
      console.log(`✅ Tabela encontrada: ${tableName}`);
      break;
    } catch (err) {
      console.log(`❌ Tabela ${tableName} não existe`);
    }
  }
  
  if (!conversationTable) {
    console.log('⚠️ Nenhuma tabela de conversas encontrada');
    await connection.end();
    return;
  }
  
  const [conversations] = await connection.execute(
    `SELECT * FROM ${conversationTable} WHERE company_id = 1 ORDER BY created_at DESC LIMIT 5`
  );
  
  console.log('📋 Conversas encontradas:', conversations.length);
  
  for (const conv of conversations) {
    console.log(`\n📞 Conversa ID: ${conv.id}, Phone: ${conv.phone_number}, Created: ${conv.created_at}`);
    
    const [messages] = await connection.execute(
      'SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp DESC LIMIT 10',
      [conv.id]
    );
    
    console.log(`📝 Mensagens (${messages.length}):`);
    for (const msg of messages) {
      const timeAgo = Math.round((Date.now() - new Date(msg.timestamp).getTime()) / 1000 / 60);
      console.log(`  ${msg.role}: "${msg.content}" (${timeAgo} min atrás)`);
    }
  }
  
  await connection.end();
}

debugConversations().catch(console.error);