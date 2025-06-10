import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

export async function ensurePointsColumn() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.PGHOST,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE,
      port: Number(process.env.PGPORT)
    });

    // Check if points column exists
    const [rows] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'services' 
      AND COLUMN_NAME = 'points'
    `, [process.env.PGDATABASE]);
    
    const columnExists = (rows as any)[0].count > 0;
    
    if (!columnExists) {
      await connection.execute('ALTER TABLE services ADD COLUMN points INT DEFAULT 0');
      console.log('✅ Points column added to services table');
    }
    
    await connection.end();
  } catch (error) {
    console.error('Error ensuring points column:', error);
  }
}