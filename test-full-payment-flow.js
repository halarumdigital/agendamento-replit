// Test script to simulate complete payment flow
const fetch = require('node-fetch');

async function testCompleteFlow() {
  console.log('🔄 Testando fluxo completo de pagamento...');
  
  try {
    // Step 1: Simulate WhatsApp confirmation to generate payment link
    console.log('1️⃣ Simulando confirmação WhatsApp (SIM)...');
    const whatsappResponse = await fetch('http://localhost:5000/api/webhook/whatsapp/teste', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        event: 'messages.upsert',
        instance: 'teste',
        data: {
          key: {
            remoteJid: '554999214230@s.whatsapp.net',
            fromMe: false,
            id: `test-webhook-flow-${Date.now()}`
          },
          message: {
            conversation: 'SIM'
          },
          messageTimestamp: Math.floor(Date.now() / 1000)
        }
      })
    });
    
    const whatsappResult = await whatsappResponse.json();
    console.log('✅ WhatsApp response:', whatsappResult);
    
    if (whatsappResult.action !== 'payment_link_sent_only') {
      console.log('❌ Fluxo inesperado, deveria ter enviado apenas link de pagamento');
      return;
    }
    
    // Step 2: Wait a moment then simulate MercadoPago webhook
    console.log('2️⃣ Aguardando 2 segundos...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 3: Get recent external reference (temp_) from logs or simulate one
    const tempExternalRef = `temp_${Date.now() - 1000}`; // Recent timestamp
    
    console.log('3️⃣ Simulando webhook MercadoPago com external_reference:', tempExternalRef);
    
    // Mock payment data that would come from MercadoPago
    const mockPaymentData = {
      id: '987654321',
      status: 'approved',
      external_reference: tempExternalRef,
      payment_method_id: 'pix',
      transaction_amount: 60,
      payer: {
        email: 'cliente@exemplo.com'
      }
    };
    
    // Simulate webhook by directly calling our endpoint with mock company access token verification
    const webhookResponse = await fetch('http://localhost:5000/api/webhook/mercadopago', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'payment',
        data: {
          id: mockPaymentData.id
        }
      })
    });
    
    const webhookResult = await webhookResponse.json();
    console.log('✅ Webhook response:', webhookResult);
    
    console.log('🎯 Teste completo finalizado!');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

testCompleteFlow();