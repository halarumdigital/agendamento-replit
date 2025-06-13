import { asaasService } from './server/services/asaas.js';

async function testAsaasIntegration() {
  try {
    console.log('🔄 Testando integração direta com Asaas...');
    
    // Test customer creation
    const customerData = {
      name: "Salão Beleza Total - Teste Direto",
      cpfCnpj: "12345678901",
      email: "teste-direto@salaobeleza.com",
      phone: "11987654321",
      externalReference: "company_direct_test_001",
      observations: "Cliente criado via teste direto"
    };
    
    console.log('📋 Dados do cliente:', customerData);
    
    const customer = await asaasService.createCustomer(customerData);
    
    console.log('✅ Cliente criado com sucesso!');
    console.log('👤 ID do cliente:', customer.id);
    console.log('📧 Email:', customer.email);
    console.log('📱 Telefone:', customer.phone);
    console.log('📅 Data de criação:', customer.dateCreated);
    
    return customer;
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    if (error.message.includes('Token')) {
      console.log('⚠️ Verifique se o token do Asaas está configurado corretamente no .env');
    }
  }
}

testAsaasIntegration();