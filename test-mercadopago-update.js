import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function testMercadoPagoUpdate() {
  let connection;
  
  try {
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    
    console.log('✅ Connected to database');
    
    // Test update
    const companyId = 1; // Test with company ID 1
    const testData = {
      mercadopago_enabled: 1,
      mercadopago_access_token: 'TEST-TOKEN-123',
      mercadopago_public_key: 'TEST-PUBLIC-KEY-123'
    };
    
    console.log('🔧 Attempting to update company:', companyId);
    console.log('🔧 Update data:', testData);
    
    const [result] = await connection.execute(
      `UPDATE companies 
       SET mercadopago_enabled = ?, 
           mercadopago_access_token = ?, 
           mercadopago_public_key = ?
       WHERE id = ?`,
      [testData.mercadopago_enabled, testData.mercadopago_access_token, testData.mercadopago_public_key, companyId]
    );
    
    console.log('✅ Update result:', result);
    
    // Verify update
    const [rows] = await connection.execute(
      'SELECT id, mercadopago_enabled, mercadopago_access_token, mercadopago_public_key FROM companies WHERE id = ?',
      [companyId]
    );
    
    console.log('📊 Company data after update:', rows[0]);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('👋 Connection closed');
    }
  }
}

testMercadoPagoUpdate();