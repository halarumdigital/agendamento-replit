const { DatabaseStorage } = require('./server/storage.js');

async function debugMercadoPagoConfig() {
  try {
    console.log('🔍 Verificando configuração do Mercado Pago...');
    
    const storage = new DatabaseStorage();
    const company = await storage.getCompany(1);
    
    if (!company) {
      console.log('❌ Empresa não encontrada');
      return;
    }
    
    console.log('🏢 Empresa:', company.fantasyName || 'Sem nome');
    console.log('🔑 Access Token:', company.mercadopagoAccessToken ? `${company.mercadopagoAccessToken.substring(0, 20)}...` : 'NÃO CONFIGURADO');
    console.log('🔑 Public Key:', company.mercadopagoPublicKey ? `${company.mercadopagoPublicKey.substring(0, 20)}...` : 'NÃO CONFIGURADO');
    
    if (!company.mercadopagoAccessToken || !company.mercadopagoPublicKey) {
      console.log('❌ PROBLEMA: Tokens do Mercado Pago não estão configurados!');
      console.log('💡 É necessário configurar as credenciais do Mercado Pago no sistema');
      
      // Set test credentials for development
      console.log('🔧 Configurando credenciais de teste...');
      await storage.updateCompany(1, {
        mercadopagoAccessToken: 'TEST-3532771697303271-063021-46f77e1dd5c5fa8e2e4f37d60b7d5f3a-1446156640',
        mercadopagoPublicKey: 'TEST-b89dcf96-2db6-4cd3-90a6-e6e8b23c09d5'
      });
      console.log('✅ Credenciais de teste configuradas!');
    } else {
      console.log('✅ Tokens do Mercado Pago estão configurados');
      
      // Test if tokens are sandbox or production
      if (company.mercadopagoAccessToken.includes('TEST')) {
        console.log('🧪 Usando tokens de TESTE (sandbox)');
      } else {
        console.log('🏭 Usando tokens de PRODUÇÃO');
      }
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar configuração:', error.message);
  }
}

debugMercadoPagoConfig();