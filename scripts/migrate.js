#!/usr/bin/env node

/**
 * Sistema de Migration para Agenday
 * Executa todas as migrations SQL em ordem sequencial
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdir, readFile } from 'fs/promises';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Configurar __dirname para ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar variáveis de ambiente
dotenv.config({ path: join(__dirname, '..', '.env') });

const config = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'agenday_dev',
  charset: 'utf8mb4'
};

async function connectDatabase() {
  try {
    console.log('🔌 Conectando ao banco de dados...');
    const connection = await mysql.createConnection(config);
    console.log('✅ Conexão estabelecida com sucesso!');
    return connection;
  } catch (error) {
    console.error('❌ Erro ao conectar com o banco:', error.message);
    process.exit(1);
  }
}

async function getMigrationFiles() {
  try {
    const migrationsPath = join(__dirname, '..', 'migrations');
    const files = await readdir(migrationsPath);
    
    // Filtrar apenas arquivos .sql e ordenar por nome
    const sqlFiles = files
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    console.log(`📁 Encontradas ${sqlFiles.length} migrations SQL`);
    return sqlFiles;
  } catch (error) {
    console.error('❌ Erro ao ler diretório de migrations:', error.message);
    process.exit(1);
  }
}

async function getExecutedMigrations(connection) {
  try {
    // Verificar se a tabela migrations existe
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'migrations'"
    );
    
    if (tables.length === 0) {
      console.log('📋 Tabela migrations não existe, será criada');
      return [];
    }
    
    const [rows] = await connection.execute(
      'SELECT filename FROM migrations ORDER BY filename'
    );
    
    const executedMigrations = rows.map(row => row.filename);
    console.log(`✅ ${executedMigrations.length} migrations já executadas`);
    
    return executedMigrations;
  } catch (error) {
    console.error('❌ Erro ao buscar migrations executadas:', error.message);
    return [];
  }
}

async function executeMigration(connection, filename) {
  try {
    const migrationPath = join(__dirname, '..', 'migrations', filename);
    const migrationSQL = await readFile(migrationPath, 'utf8');
    
    console.log(`⚡ Executando migration: ${filename}`);
    
    // Dividir SQL em comandos individuais
    const commands = migrationSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    // Executar cada comando
    for (const command of commands) {
      if (command.trim()) {
        await connection.execute(command);
      }
    }
    
    console.log(`✅ Migration ${filename} executada com sucesso!`);
    return true;
  } catch (error) {
    console.error(`❌ Erro ao executar migration ${filename}:`, error.message);
    return false;
  }
}

async function runMigrations() {
  console.log('🚀 Iniciando sistema de migrations...\n');
  
  const connection = await connectDatabase();
  
  try {
    // Obter lista de migrations
    const migrationFiles = await getMigrationFiles();
    const executedMigrations = await getExecutedMigrations(connection);
    
    // Filtrar migrations não executadas
    const pendingMigrations = migrationFiles.filter(
      file => !executedMigrations.includes(file)
    );
    
    if (pendingMigrations.length === 0) {
      console.log('✅ Todas as migrations já foram executadas!');
      return;
    }
    
    console.log(`📋 ${pendingMigrations.length} migrations pendentes:`);
    pendingMigrations.forEach(file => console.log(`   - ${file}`));
    console.log();
    
    // Executar migrations pendentes
    let successCount = 0;
    for (const migration of pendingMigrations) {
      const success = await executeMigration(connection, migration);
      if (success) {
        successCount++;
      } else {
        console.error(`❌ Parando execução devido ao erro na migration: ${migration}`);
        break;
      }
    }
    
    console.log(`\n🎉 Processo concluído! ${successCount}/${pendingMigrations.length} migrations executadas com sucesso.`);
    
  } catch (error) {
    console.error('❌ Erro geral durante execução das migrations:', error.message);
  } finally {
    await connection.end();
    console.log('👋 Conexão com banco finalizada');
  }
}

// Executar apenas se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations().catch(console.error);
}