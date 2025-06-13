import dotenv from 'dotenv';
dotenv.config();

async function testAsaasToken() {
  const token = process.env.ASAAS_APIKEY;
  console.log('Token encontrado:', token ? 'SIM' : 'NÃO');
  console.log('Token (primeiros 20 chars):', token ? token.substring(0, 20) : 'N/A');
  
  if (!token) {
    console.log('❌ Token não encontrado no .env');
    return;
  }

  try {
    const response = await fetch('https://api-sandbox.asaas.com/v3/customers', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'access_token': token,
      },
    });

    console.log('Status da resposta:', response.status);
    const responseText = await response.text();
    console.log('Resposta da API:', responseText);

    if (response.ok) {
      console.log('✅ Token válido - API funcionando');
    } else {
      console.log('❌ Token inválido ou problema na API');
    }
  } catch (error) {
    console.log('❌ Erro ao testar token:', error.message);
  }
}

testAsaasToken();