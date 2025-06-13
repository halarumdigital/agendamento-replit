// Test script to verify Asaas customer creation

const ASAAS_API_URL = "https://api-sandbox.asaas.com/v3";
const ASAAS_TOKEN = "$aact_hmlg_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OmRkMDU1NDMzLTNlZjctNDlkNS1hYTdlLTQzM2RjODAzY2E2NTo6JGFhY2hfZGMzNjhkMTQtODVmNi00NThmLTgyY2YtMDRkY2VmMWQ0YmRj";

async function testCreateCustomer() {
  try {
    console.log('🔄 Testando criação de cliente no Asaas...');
    
    const testCustomer = {
      name: "Salão Beleza Total - Teste",
      cpfCnpj: "12345678901",
      email: "contato@salaobelezatotal.com",
      phone: "11987654321",
      externalReference: "company_test_001",
      observations: "Cliente criado via sistema de teste"
    };
    
    console.log('📋 Dados do cliente:', testCustomer);
    
    const response = await fetch(`${ASAAS_API_URL}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_TOKEN,
      },
      body: JSON.stringify(testCustomer)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Cliente criado com sucesso!');
      console.log('👤 Dados do cliente criado:');
      console.log(`   ID: ${result.id}`);
      console.log(`   Nome: ${result.name}`);
      console.log(`   Email: ${result.email}`);
      console.log(`   CPF: ${result.cpfCnpj}`);
      console.log(`   Telefone: ${result.phone}`);
      console.log(`   Data de criação: ${result.dateCreated}`);
      console.log(`   Referência externa: ${result.externalReference}`);
      
      return result.id;
    } else {
      console.error('❌ Erro ao criar cliente:');
      console.error('Status:', response.status);
      console.error('Resposta:', result);
      
      if (result.errors) {
        console.error('Erros específicos:');
        result.errors.forEach((error, index) => {
          console.error(`  ${index + 1}. ${error.description}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  }
}

testCreateCustomer();