import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: '69.62.101.23',
  user: 'gilliard_salao',
  password: 'MaL8zxSzuCJMLK3D',
  database: 'gilliard_salao',
  port: 3306
});

async function createSampleTourSteps() {
  try {
    console.log('Creating sample tour steps...');

    // First, clear existing tour steps
    await connection.execute('DELETE FROM tour_steps');
    
    // Insert sample tour steps
    const tourSteps = [
      {
        title: 'Bem-vindo ao Sistema!',
        content: 'Este é o painel principal da sua empresa. Aqui você pode ver um resumo das suas atividades e acessar todas as funcionalidades do sistema.',
        targetElement: '.dashboard-overview',
        position: 'bottom',
        orderIndex: 1
      },
      {
        title: 'Menu de Navegação',
        content: 'Use este menu lateral para navegar entre as diferentes seções do sistema: agendamentos, clientes, serviços e muito mais.',
        targetElement: '.sidebar',
        position: 'right',
        orderIndex: 2
      },
      {
        title: 'Agendamentos',
        content: 'Aqui você pode visualizar e gerenciar todos os seus agendamentos. Clique para acessar a agenda completa.',
        targetElement: '[href="/company/appointments"]',
        position: 'right',
        orderIndex: 3
      },
      {
        title: 'Clientes',
        content: 'Gerencie sua base de clientes, adicione novos clientes e visualize o histórico de cada um.',
        targetElement: '[href="/company/clients"]',
        position: 'right',
        orderIndex: 4
      },
      {
        title: 'Configurações',
        content: 'Personalize sua conta, configure integrações e ajuste as preferências do sistema.',
        targetElement: '[href="/company/settings"]',
        position: 'right',
        orderIndex: 5
      }
    ];

    for (const step of tourSteps) {
      await connection.execute(
        'INSERT INTO tour_steps (title, content, target_element, position, order_index) VALUES (?, ?, ?, ?, ?)',
        [step.title, step.content, step.targetElement, step.position, step.orderIndex]
      );
    }

    console.log('✅ Sample tour steps created successfully!');
    
    // Verify the steps were created
    const [steps] = await connection.execute('SELECT * FROM tour_steps ORDER BY order_index');
    console.log(`📊 Total tour steps: ${steps.length}`);
    
  } catch (error) {
    console.error('❌ Error creating sample tour steps:', error);
  } finally {
    await connection.end();
  }
}

createSampleTourSteps();