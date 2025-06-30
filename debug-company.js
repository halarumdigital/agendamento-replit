// Script temporário para debug do login da empresa
import { DatabaseStorage } from './server/storage.ts';

const storage = new DatabaseStorage();

async function debugCompany() {
  try {
    await storage.init();
    const company = await storage.getCompanyByEmail('damaceno02@hotmail.com');
    
    console.log('Dados da empresa encontrada:');
    console.log('ID:', company?.id);
    console.log('Email:', company?.email);
    console.log('Fantasy Name:', company?.fantasyName);
    console.log('Password (hash):', company?.password ? '[HASH PRESENTE]' : '[SENHA VAZIA/NULL]');
    console.log('Password length:', company?.password?.length || 0);
    console.log('Is Active:', company?.isActive);
    console.log('Plan Status:', company?.planStatus);
    
    // Verificar se a senha está nula ou vazia
    if (!company?.password) {
      console.log('\n❌ PROBLEMA ENCONTRADO: Senha da empresa está vazia ou nula!');
      console.log('Precisa definir uma senha para a empresa.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Erro:', error);
    process.exit(1);
  }
}

debugCompany();