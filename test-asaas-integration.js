// Test script to verify Asaas integration
import fetch from 'node-fetch';

const ASAAS_API_URL = "https://api-sandbox.asaas.com/v3";
const ASAAS_TOKEN = "$aact_hmlg_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OmRkMDU1NDMzLTNlZjctNDlkNS1hYTdlLTQzM2RjODAzY2E2NTo6JGFhY2hfZGMzNjhkMTQtODVmNi00NThmLTgyY2YtMDRkY2VmMWQ0YmRj";

async function testAsaasConnection() {
  try {
    console.log('🔄 Testando conexão com API do Asaas...');
    
    // Test 1: List customers
    const customersResponse = await fetch(`${ASAAS_API_URL}/customers?limit=5`, {
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_TOKEN,
      }
    });
    
    const customersData = await customersResponse.json();
    
    if (customersResponse.ok) {
      console.log('✅ Conexão com Asaas bem-sucedida!');
      console.log(`📊 Total de clientes: ${customersData.totalCount}`);
    } else {
      console.error('❌ Erro na conexão:', customersData);
      return;
    }
    
    // Test 2: Create a test customer
    console.log('\n📝 Criando cliente de teste...');
    
    const testCustomer = {
      name: "Empresa Teste - Sistema Salão",
      cpfCnpj: "12345678901",
      email: "teste@sistema-salao.com",
      phone: "11999999999",
      externalReference: "test_company_123"
    };
    
    const createCustomerResponse = await fetch(`${ASAAS_API_URL}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_TOKEN,
      },
      body: JSON.stringify(testCustomer)
    });
    
    const newCustomer = await createCustomerResponse.json();
    
    if (createCustomerResponse.ok) {
      console.log('✅ Cliente criado com sucesso!');
      console.log(`👤 ID do cliente: ${newCustomer.id}`);
      console.log(`📧 Email: ${newCustomer.email}`);
      
      // Test 3: Create a test payment
      console.log('\n💳 Criando cobrança de teste...');
      
      const testPayment = {
        customer: newCustomer.id,
        billingType: 'CREDIT_CARD',
        value: 89.90,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow
        description: 'Teste de assinatura - Plano Profissional',
        externalReference: 'subscription_test_123',
        creditCard: {
          holderName: 'TESTE SISTEMA SALAO',
          number: '5162306219378829', // Número de teste válido
          expiryMonth: '12',
          expiryYear: '2028',
          ccv: '123'
        },
        creditCardHolderInfo: {
          name: 'TESTE SISTEMA SALAO',
          email: 'teste@sistema-salao.com',
          cpfCnpj: '12345678901',
          postalCode: '01310100',
          addressNumber: '100',
          phone: '11999999999'
        }
      };
      
      const createPaymentResponse = await fetch(`${ASAAS_API_URL}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': ASAAS_TOKEN,
        },
        body: JSON.stringify(testPayment)
      });
      
      const newPayment = await createPaymentResponse.json();
      
      if (createPaymentResponse.ok) {
        console.log('✅ Cobrança criada com sucesso!');
        console.log(`💰 ID do pagamento: ${newPayment.id}`);
        console.log(`📊 Status: ${newPayment.status}`);
        console.log(`💵 Valor: R$ ${newPayment.value}`);
        console.log(`📅 Vencimento: ${newPayment.dueDate}`);
        
        if (newPayment.status === 'CONFIRMED') {
          console.log('🎉 Pagamento confirmado automaticamente!');
        } else if (newPayment.status === 'PENDING') {
          console.log('⏳ Pagamento pendente de aprovação');
        }
      } else {
        console.error('❌ Erro ao criar cobrança:', newPayment);
      }
      
    } else {
      console.error('❌ Erro ao criar cliente:', newCustomer);
    }
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  }
}

testAsaasConnection();