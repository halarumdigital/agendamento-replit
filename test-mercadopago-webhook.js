// Test script to simulate MercadoPago webhook for payment approval
import fetch from 'node-fetch';

async function testWebhook() {
  console.log('🧪 Testando webhook do Mercado Pago...');
  
  // Simulate a payment notification with temp_ external reference (new flow)
  const webhookPayload = {
    type: 'payment',
    data: {
      id: 'test_payment_123'
    }
  };
  
  try {
    const response = await fetch('http://localhost:5000/api/webhook/mercadopago', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhookPayload)
    });
    
    const result = await response.json();
    console.log('✅ Webhook response:', result);
    
  } catch (error) {
    console.error('❌ Error testing webhook:', error);
  }
}

testWebhook();