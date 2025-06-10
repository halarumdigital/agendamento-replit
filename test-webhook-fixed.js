// Test webhook with proper payload format
const webhookUrl = 'http://localhost:5000/api/webhook/whatsapp/deploy1';

const testPayload = {
  event: "messages.upsert",
  data: {
    key: {
      remoteJid: "554999214230@s.whatsapp.net",
      fromMe: false,
      id: "test_" + Date.now()
    },
    message: {
      conversation: "Olá, quero agendar um horário"
    },
    messageTimestamp: Math.floor(Date.now() / 1000)
  }
};

console.log('Testing webhook with payload:', JSON.stringify(testPayload, null, 2));

fetch(webhookUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(testPayload)
})
.then(response => response.json())
.then(data => {
  console.log('Webhook response:', data);
})
.catch(error => {
  console.error('Webhook test error:', error);
});