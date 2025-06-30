#!/usr/bin/env node

// Script para testar a API Mobile do Agenday

const API_BASE = 'http://localhost:5000/api/mobile';
let authToken = null;

// Helper para fazer requisições
async function apiRequest(endpoint, method = 'GET', data = null, useAuth = true) {
  const url = `${API_BASE}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    }
  };

  if (useAuth && authToken) {
    options.headers.Authorization = `Bearer ${authToken}`;
  }

  if (data && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    const result = await response.json();
    
    console.log(`${method} ${endpoint} - Status: ${response.status}`);
    console.log('Response:', JSON.stringify(result, null, 2));
    console.log('---');
    
    return { response, result };
  } catch (error) {
    console.error(`Error in ${method} ${endpoint}:`, error.message);
    return { error };
  }
}

async function testMobileAPI() {
  console.log('🚀 Testando API Mobile do Agenday\n');

  // 1. Testar status da API
  console.log('1. Testando status da API...');
  await apiRequest('/status', 'GET', null, false);

  // 2. Testar login de empresa
  console.log('2. Testando login de empresa...');
  const loginResult = await apiRequest('/auth/login', 'POST', {
    email: 'empresa@teste.com',
    password: '123456'
  }, false);

  if (loginResult.result && loginResult.result.success && loginResult.result.data.token) {
    authToken = loginResult.result.data.token;
    console.log('✅ Login realizado com sucesso! Token obtido.\n');
  } else {
    console.log('❌ Falha no login. Continuando sem autenticação...\n');
  }

  // 3. Testar endpoints autenticados (se tiver token)
  if (authToken) {
    console.log('3. Testando endpoints autenticados...');
    
    // Dashboard
    console.log('3.1. Dashboard...');
    await apiRequest('/dashboard');

    // Profissionais
    console.log('3.2. Profissionais...');
    await apiRequest('/professionals');

    // Serviços
    console.log('3.3. Serviços...');
    await apiRequest('/services');

    // Agendamentos
    console.log('3.4. Agendamentos...');
    await apiRequest('/appointments');

    // Agendamentos de hoje
    const today = new Date().toISOString().split('T')[0];
    console.log('3.5. Agendamentos de hoje...');
    await apiRequest(`/appointments?date=${today}`);

    // Configurações da empresa
    console.log('3.6. Configurações da empresa...');
    await apiRequest('/settings/company');

    // Notificações
    console.log('3.7. Notificações...');
    await apiRequest('/notifications');

    // Clientes
    console.log('3.8. Clientes...');
    await apiRequest('/clients');

    // Horários disponíveis (exemplo)
    console.log('3.9. Horários disponíveis...');
    await apiRequest(`/schedule/available-slots?professionalId=1&serviceId=1&date=${today}`);

    // Calendário
    console.log('3.10. Calendário mensal...');
    await apiRequest('/schedule/calendar?year=2025&month=6');

    // Relatório de performance
    console.log('3.11. Relatório de performance...');
    await apiRequest('/reports/performance?period=month&year=2025&month=6');
  }

  console.log('✅ Teste da API Mobile concluído!');
}

// Executar testes
testMobileAPI().catch(console.error);