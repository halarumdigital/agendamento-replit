// Test the complete payment flow again with the fixed credentials
const fetch = require('node-fetch');

async function testPaymentFlow() {
  try {
    console.log('🧪 Testing payment flow with SIM confirmation...');
    
    // Simulate user sending "sim" confirmation message
    const webhookData = {
      data: {
        key: {
          remoteJid: "554999214230@s.whatsapp.net",
          id: "TEST_MESSAGE_ID_" + Date.now()
        },
        message: {
          conversation: "sim"
        },
        messageTimestamp: Math.floor(Date.now() / 1000),
        pushName: "Jaco"
      },
      instance: "teste",
      server_url: "http://localhost:5000",
      date_time: new Date().toISOString()
    };

    console.log('📤 Sending SIM confirmation webhook...');
    const response = await fetch('http://localhost:5000/api/webhook/whatsapp/teste', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhookData)
    });

    const result = await response.json();
    console.log('✅ Response:', result);
    
    if (result.processed) {
      console.log('🎯 Payment link should be generated and sent automatically');
      console.log('💡 Check the server logs for payment link generation details');
    } else {
      console.log('⚠️ Message was not processed as expected');
    }
    
  } catch (error) {
    console.error('❌ Error testing payment flow:', error.message);
  }
}

testPaymentFlow();