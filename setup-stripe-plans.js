import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Script para configurar os IDs do Stripe Dashboard nos planos do banco de dados
 * 
 * ANTES DE EXECUTAR:
 * 1. Acesse https://dashboard.stripe.com/products
 * 2. Crie os produtos e preços no Stripe Dashboard
 * 3. Copie os Price IDs (começam com 'price_') 
 * 4. Configure os IDs abaixo
 */

// CONFIGURE AQUI OS IDS DOS SEUS PLANOS NO STRIPE DASHBOARD
const STRIPE_PLANS_CONFIG = {
  // Substitua pelos seus Price IDs reais do Stripe Dashboard
  BASICO: 'price_SUBSTITUA_PELO_ID_REAL_BASICO',
  PREMIUM: 'price_SUBSTITUA_PELO_ID_REAL_PREMIUM', 
  EMPRESARIAL: 'price_SUBSTITUA_PELO_ID_REAL_EMPRESARIAL'
};

async function setupStripePlans() {
  let connection;
  
  try {
    console.log('🔄 Conectando ao banco de dados MySQL...');
    
    // Create connection using environment variables
    connection = await mysql.createConnection({
      host: process.env.PGHOST,
      port: process.env.PGPORT,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE
    });

    console.log('✅ Conectado ao banco de dados');

    // Verificar se algum ID ainda é placeholder
    const hasPlaceholders = Object.values(STRIPE_PLANS_CONFIG).some(id => 
      id.includes('SUBSTITUA_PELO_ID_REAL')
    );

    if (hasPlaceholders) {
      console.log('⚠️  ATENÇÃO: Você precisa configurar os Price IDs reais do Stripe Dashboard');
      console.log('📋 Siga estes passos:');
      console.log('   1. Acesse https://dashboard.stripe.com/products');
      console.log('   2. Crie produtos e preços para cada plano');
      console.log('   3. Copie os Price IDs (começam com "price_")');
      console.log('   4. Substitua os valores em STRIPE_PLANS_CONFIG neste arquivo');
      console.log('   5. Execute o script novamente');
      return;
    }

    console.log('🔄 Atualizando planos com IDs do Stripe...');

    // Atualizar Plano Básico
    const [basicResult] = await connection.execute(`
      UPDATE plans 
      SET stripe_price_id = ?
      WHERE (name LIKE '%básico%' OR name LIKE '%basic%') AND is_active = 1
    `, [STRIPE_PLANS_CONFIG.BASICO]);

    console.log(`✅ Plano Básico atualizado (${basicResult.affectedRows} registros)`);

    // Atualizar Plano Premium
    const [premiumResult] = await connection.execute(`
      UPDATE plans 
      SET stripe_price_id = ?
      WHERE (name LIKE '%premium%') AND is_active = 1
    `, [STRIPE_PLANS_CONFIG.PREMIUM]);

    console.log(`✅ Plano Premium atualizado (${premiumResult.affectedRows} registros)`);

    // Atualizar Plano Empresarial
    const [enterpriseResult] = await connection.execute(`
      UPDATE plans 
      SET stripe_price_id = ?
      WHERE (name LIKE '%empresarial%' OR name LIKE '%enterprise%') AND is_active = 1
    `, [STRIPE_PLANS_CONFIG.EMPRESARIAL]);

    console.log(`✅ Plano Empresarial atualizado (${enterpriseResult.affectedRows} registros)`);

    // Verificar resultado final
    console.log('\n🔍 Verificando configuração final dos planos:');
    const [plans] = await connection.execute(`
      SELECT id, name, price, stripe_price_id, is_active
      FROM plans 
      WHERE is_active = 1
      ORDER BY price ASC
    `);

    console.table(plans);

    // Verificar se algum plano ativo não tem stripe_price_id
    const plansWithoutStripeId = plans.filter(plan => !plan.stripe_price_id);
    
    if (plansWithoutStripeId.length > 0) {
      console.log('\n⚠️  ATENÇÃO: Os seguintes planos ativos não possuem stripe_price_id:');
      console.table(plansWithoutStripeId);
      console.log('📋 Configure manualmente os IDs para estes planos ou ajuste o script');
    } else {
      console.log('\n🎉 Todos os planos ativos possuem stripe_price_id configurado!');
      console.log('✅ Sistema pronto para criar assinaturas com Stripe');
    }

  } catch (error) {
    console.error('❌ Erro ao configurar planos Stripe:', error);
    
    if (error.code === 'ER_NO_SUCH_TABLE') {
      console.log('📋 A tabela "plans" não existe. Certifique-se de que o banco de dados foi inicializado');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('📋 Não foi possível conectar ao banco de dados. Verifique as variáveis de ambiente');
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexão com banco de dados encerrada');
    }
  }
}

// Executar script
setupStripePlans();