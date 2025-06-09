// Script para testar webhook da Evolution API
const webhookUrl = 'https://07b4ad9c-b4ba-47b9-b33a-5b10e0c81e3e-00-3jx6rq6m7mxj8.kirk.replit.dev/api/webhook/whatsapp/deploy';

const webhookPayload = {
  webhook: {
    enabled: true,
    url: webhookUrl,
    base64: true,
    events: [
      "QRCODE_UPDATED",
      "MESSAGES_UPSERT", 
      "CONNECTION_UPDATE"
    ]
  },
  webhook_by_events: false
};

console.log('Webhook URL:', webhookUrl);
console.log('Payload:', JSON.stringify(webhookPayload, null, 2));

// Teste de conectividade
fetch(webhookUrl, {
  method: 'GET'
}).then(res => {
  console.log('Webhook endpoint status:', res.status);
  return res.text();
}).then(text => {
  console.log('Webhook response:', text);
}).catch(err => {
  console.error('Webhook test error:', err.message);
});