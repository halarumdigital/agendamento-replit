const mysql = require('mysql2/promise');

async function addMercadopagoColumns() {
  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || '31.97.166.39',
    port: process.env.MYSQL_PORT || 3306,
    user: process.env.MYSQL_USER || 'agenday_dev',
    password: process.env.MYSQL_PASSWORD || 'n80bbV7sjLjD',
    database: process.env.MYSQL_DATABASE || 'agenday_dev',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  try {
    console.log('🔧 Adicionando colunas do Mercado Pago à tabela companies...');

    // Verificar se as colunas já existem
    const [columns] = await pool.execute(
      "SHOW COLUMNS FROM companies LIKE 'mercadopago_%'"
    );

    const existingColumns = columns.map(col => col.Field);

    if (!existingColumns.includes('mercadopago_access_token')) {
      await pool.execute('ALTER TABLE companies ADD COLUMN mercadopago_access_token VARCHAR(500) DEFAULT NULL');
      console.log('✅ Coluna mercadopago_access_token adicionada');
    } else {
      console.log('✅ Coluna mercadopago_access_token já existe');
    }

    if (!existingColumns.includes('mercadopago_public_key')) {
      await pool.execute('ALTER TABLE companies ADD COLUMN mercadopago_public_key VARCHAR(255) DEFAULT NULL');
      console.log('✅ Coluna mercadopago_public_key adicionada');
    } else {
      console.log('✅ Coluna mercadopago_public_key já existe');
    }

    if (!existingColumns.includes('mercadopago_webhook_url')) {
      await pool.execute('ALTER TABLE companies ADD COLUMN mercadopago_webhook_url VARCHAR(500) DEFAULT NULL');
      console.log('✅ Coluna mercadopago_webhook_url adicionada');
    } else {
      console.log('✅ Coluna mercadopago_webhook_url já existe');
    }

    console.log('✅ Migração das colunas do Mercado Pago concluída!');
  } catch (error) {
    console.error('❌ Erro na migração do Mercado Pago:', error);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  addMercadopagoColumns();
}

module.exports = addMercadopagoColumns;