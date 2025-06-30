const mysql = require('mysql2/promise');

const config = {
  host: '31.97.166.39',
  port: 3306,
  user: 'agenday_dev',
  password: 'n80bbV7sjLjD',
  database: 'agenday_dev'
};

async function addOpenAIUsageTable() {
  const connection = await mysql.createConnection(config);
  
  try {
    console.log('🚀 Creating OpenAI usage tracking table...');
    
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS openai_usage (
        id INT AUTO_INCREMENT PRIMARY KEY,
        request_date DATETIME NOT NULL,
        model VARCHAR(100) NOT NULL,
        prompt_tokens INT NOT NULL DEFAULT 0,
        completion_tokens INT NOT NULL DEFAULT 0,
        total_tokens INT NOT NULL DEFAULT 0,
        cost_estimate DECIMAL(10, 6) NOT NULL DEFAULT 0.000000,
        request_type VARCHAR(50) NOT NULL DEFAULT 'chat',
        company_id INT NULL,
        success BOOLEAN NOT NULL DEFAULT true,
        error_message TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_request_date (request_date),
        INDEX idx_company_id (company_id),
        INDEX idx_model (model)
      )
    `);
    
    console.log('✅ OpenAI usage table created successfully');
    
    // Check if foreign key constraint exists
    const [fkRows] = await connection.execute(`
      SELECT CONSTRAINT_NAME 
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'openai_usage' 
      AND CONSTRAINT_NAME LIKE 'openai_usage_ibfk_%'
    `, [config.database]);
    
    if (fkRows.length === 0) {
      try {
        await connection.execute(`
          ALTER TABLE openai_usage 
          ADD CONSTRAINT openai_usage_ibfk_1 
          FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
        `);
        console.log('✅ Foreign key constraint added');
      } catch (error) {
        console.log('⚠️  Foreign key constraint already exists or companies table not found:', error.message);
      }
    } else {
      console.log('✅ Foreign key constraint already exists');
    }
    
  } catch (error) {
    console.error('❌ Error creating OpenAI usage table:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// Execute if run directly
if (require.main === module) {
  addOpenAIUsageTable()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = addOpenAIUsageTable;