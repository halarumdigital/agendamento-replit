const mysql = require('mysql2/promise');

async function checkMercadoPagoConfig() {
  try {
    console.log('🔍 Verificando configuração do Mercado Pago...');
    
    const connection = await mysql.createConnection({
      host: '31.97.166.39',
      port: 3306,
      user: 'agenday_dev',
      password: 'agenday123',
      database: 'agenday_dev'
    });

    const [rows] = await connection.execute(
      'SELECT id, fantasyName, mercadopagoAccessToken, mercadopagoPublicKey FROM companies WHERE id = 1'
    );

    if (rows.length > 0) {
      const company = rows[0];
      console.log('🏢 Empresa:', company.fantasyName);
      console.log('🔑 Access Token:', company.mercadopagoAccessToken ? `${company.mercadopagoAccessToken.substring(0, 20)}...` : 'NÃO CONFIGURADO');
      console.log('🔑 Public Key:', company.mercadopagoPublicKey ? `${company.mercadopagoPublicKey.substring(0, 20)}...` : 'NÃO CONFIGURADO');
      
      if (!company.mercadopagoAccessToken || !company.mercadopagoPublicKey) {
        console.log('❌ PROBLEMA: Tokens do Mercado Pago não estão configurados!');
        console.log('💡 Solução: Configure os tokens no painel administrativo');
      } else {
        console.log('✅ Tokens do Mercado Pago estão configurados');
        
        // Test if tokens are sandbox or production
        if (company.mercadopagoAccessToken.includes('TEST')) {
          console.log('🧪 Usando tokens de TESTE (sandbox)');
        } else {
          console.log('🏭 Usando tokens de PRODUÇÃO');
        }
      }
    } else {
      console.log('❌ Empresa não encontrada');
    }

    await connection.end();
    
  } catch (error) {
    console.error('❌ Erro ao verificar configuração:', error.message);
  }
}

checkMercadoPagoConfig();