import mysql from 'mysql2/promise';
import 'dotenv/config';

async function testMySQLConnection() {
  console.log('🔍 Testando conexão MySQL...');
  console.log('Configuração:');
  console.log(`Host: ${process.env.MYSQL_HOST}`);
  console.log(`Port: ${process.env.MYSQL_PORT}`);
  console.log(`User: ${process.env.MYSQL_USER}`);
  console.log(`Database: ${process.env.MYSQL_DATABASE}`);
  
  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      ssl: false
    });
    
    console.log('✅ Conexão MySQL estabelecida com sucesso!');
    
    // Testar uma query simples
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('✅ Query de teste executada:', rows);
    
    await connection.end();
    console.log('✅ Conexão fechada.');
    
  } catch (error) {
    console.error('❌ Erro na conexão MySQL:', error.message);
    console.error('Código do erro:', error.code);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Possíveis soluções:');
      console.log('1. Verificar se o MySQL está rodando');
      console.log('2. Verificar as configurações no arquivo .env');
      console.log('3. Verificar se a porta 3306 está disponível');
      console.log('4. Considerar usar SQLite para desenvolvimento');
    }
  }
}

testMySQLConnection();