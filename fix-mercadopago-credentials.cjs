const mysql = require('mysql2/promise');

async function fixMercadoPagoCredentials() {
  try {
    console.log('🔧 Configurando credenciais de teste do Mercado Pago...');
    
    // Connect directly using the same config as the server
    const connection = await mysql.createConnection({
      host: '31.97.166.39',
      port: 3306,
      user: 'agenday_dev',
      password: 'agenday123',
      database: 'agenday_dev',
      connectTimeout: 10000,
      acquireTimeout: 10000
    });

    // Update company with test credentials
    const testAccessToken = 'TEST-3532771697303271-063021-46f77e1dd5c5fa8e2e4f37d60b7d5f3a-1446156640';
    const testPublicKey = 'TEST-b89dcf96-2db6-4cd3-90a6-e6e8b23c09d5';
    
    const [updateResult] = await connection.execute(
      'UPDATE companies SET mercadopagoAccessToken = ?, mercadopagoPublicKey = ? WHERE id = 1',
      [testAccessToken, testPublicKey]
    );
    
    console.log('✅ Credenciais de teste configuradas!');
    console.log('🔑 Access Token:', `${testAccessToken.substring(0, 20)}...`);
    console.log('🔑 Public Key:', `${testPublicKey.substring(0, 20)}...`);
    
    // Verify the update
    const [rows] = await connection.execute(
      'SELECT mercadopagoAccessToken, mercadopagoPublicKey FROM companies WHERE id = 1'
    );
    
    if (rows.length > 0) {
      const company = rows[0];
      if (company.mercadopagoAccessToken && company.mercadopagoPublicKey) {
        console.log('✅ Verificação: Credenciais salvas corretamente no banco');
      } else {
        console.log('❌ Erro: Credenciais não foram salvas');
      }
    }
    
    await connection.end();
    console.log('🎯 Configuração concluída! Teste o pagamento novamente.');
    
  } catch (error) {
    console.error('❌ Erro ao configurar credenciais:', error.message);
  }
}

fixMercadoPagoCredentials();