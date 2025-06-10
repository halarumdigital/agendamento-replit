// Script para testar o sistema de notificações
const testNotification = async () => {
  try {
    // Criar um agendamento de teste
    const response = await fetch('/api/company/appointments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        companyId: 4,
        professionalId: 3,
        serviceId: 7,
        clientName: "Teste Notificação",
        clientPhone: "5547999999999",
        clientEmail: "teste@example.com",
        appointmentDate: "2025-06-11",
        appointmentTime: "14:30",
        status: "agendado",
        notes: "Teste do sistema de notificações"
      })
    });

    const data = await response.json();
    console.log('Agendamento criado:', data);
  } catch (error) {
    console.error('Erro ao criar agendamento de teste:', error);
  }
};

// Executar teste quando a página carregar
if (typeof window !== 'undefined') {
  window.testNotification = testNotification;
}