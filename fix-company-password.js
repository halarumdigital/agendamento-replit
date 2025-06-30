// Script para corrigir senha da empresa
import bcrypt from 'bcrypt';
import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: '31.97.166.39',
  port: 3306,
  user: 'agenday_dev',
  password: 'HFde43@das%',
  database: 'agenday_dev'
});

async function fixCompanyPassword() {
  try {
    // Verificar empresa atual
    const [rows] = await connection.execute(
      'SELECT id, email, password, fantasyName FROM companies WHERE email = ?',
      ['damaceno02@hotmail.com']
    );
    
    if (rows.length === 0) {
      console.log('❌ Empresa não encontrada!');
      return;
    }
    
    const company = rows[0];
    console.log('📊 Empresa encontrada:', {
      id: company.id,
      email: company.email,
      fantasyName: company.fantasyName,
      hasPassword: !!company.password
    });
    
    // Definir senha padrão: 123456
    const defaultPassword = '123456';
    const hashedPassword = await bcrypt.hash(defaultPassword, 12);
    
    // Atualizar senha no banco
    await connection.execute(
      'UPDATE companies SET password = ? WHERE id = ?',
      [hashedPassword, company.id]
    );
    
    console.log('✅ Senha da empresa atualizada com sucesso!');
    console.log(`🔑 Nova senha: ${defaultPassword}`);
    console.log('📧 Email:', company.email);
    
    // Verificar se foi atualizada
    const [updatedRows] = await connection.execute(
      'SELECT id, email, password FROM companies WHERE id = ?',
      [company.id]
    );
    
    const updatedCompany = updatedRows[0];
    console.log('✅ Verificação: Senha hash criado:', !!updatedCompany.password);
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await connection.end();
    process.exit(0);
  }
}

fixCompanyPassword();