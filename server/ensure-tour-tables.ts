import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: '69.62.101.23',
  port: 3306,
  user: 'gilliard_salao',
  password: process.env.DB_PASSWORD,
  database: 'gilliard_salao',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export async function ensureTourTables() {
  try {
    // Create tour_steps table using raw query
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS tour_steps (
        id INT PRIMARY KEY AUTO_INCREMENT,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        target_element VARCHAR(255) NOT NULL,
        placement VARCHAR(20) DEFAULT 'bottom',
        step_order INT NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Create company_tour_progress table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS company_tour_progress (
        id INT PRIMARY KEY AUTO_INCREMENT,
        company_id INT NOT NULL,
        has_completed_tour BOOLEAN DEFAULT FALSE,
        current_step INT DEFAULT 1,
        completed_at DATETIME NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Check if tour steps already exist
    const [existingSteps] = await pool.execute('SELECT COUNT(*) as count FROM tour_steps');
    const count = (existingSteps as any)[0].count;
    
    if (count === 0) {
      // Insert default tour steps
      const tourSteps = [
        {
          title: 'Bem-vindo ao Sistema!',
          description: 'Este é o painel principal onde você pode ver um resumo de todos os seus agendamentos e atividades.',
          target_element: '[data-tour="dashboard"]',
          placement: 'bottom',
          step_order: 1
        },
        {
          title: 'Agendamentos',
          description: 'Aqui você pode gerenciar todos os seus agendamentos, criar novos e acompanhar o status de cada um.',
          target_element: '[data-tour="appointments"]',
          placement: 'right',
          step_order: 2
        },
        {
          title: 'Clientes',
          description: 'Gerencie sua base de clientes, adicione novos contatos e mantenha o histórico de atendimentos.',
          target_element: '[data-tour="clients"]',
          placement: 'right',
          step_order: 3
        },
        {
          title: 'Profissionais',
          description: 'Cadastre e gerencie os profissionais da sua empresa, defina horários e especialidades.',
          target_element: '[data-tour="professionals"]',
          placement: 'right',
          step_order: 4
        },
        {
          title: 'Serviços',
          description: 'Configure os serviços oferecidos, preços, durações e categorias.',
          target_element: '[data-tour="services"]',
          placement: 'right',
          step_order: 5
        },
        {
          title: 'WhatsApp',
          description: 'Configure a integração com WhatsApp para enviar lembretes automáticos e se comunicar com clientes.',
          target_element: '[data-tour="whatsapp"]',
          placement: 'right',
          step_order: 6
        },
        {
          title: 'Configurações',
          description: 'Personalize as configurações da sua empresa, horários de funcionamento e preferências do sistema.',
          target_element: '[data-tour="settings"]',
          placement: 'left',
          step_order: 7
        }
      ];

      for (const step of tourSteps) {
        await pool.execute(
          `INSERT INTO tour_steps (title, description, target_element, placement, step_order)
           VALUES (?, ?, ?, ?, ?)`,
          [step.title, step.description, step.target_element, step.placement, step.step_order]
        );
      }
      console.log('✅ Default tour steps created');
    } else {
      console.log('✅ Tour steps already exist');
    }

    console.log('✅ Tour tables created/verified');

  } catch (error) {
    console.error('❌ Error creating tour tables:', error);
  }
}