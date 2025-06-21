import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from "@shared/schema";

// Use SQLite for Replit compatibility
const sqlite = new Database('./database.db');
const db = drizzle(sqlite, { schema });

// Create a pool-like interface for compatibility
const pool = {
  execute: async (query: string, params: any[] = []) => {
    try {
      const stmt = sqlite.prepare(query);
      const result = stmt.all(...params);
      return [result, []];
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  },
  query: async (query: string, params: any[] = []) => {
    try {
      const stmt = sqlite.prepare(query);
      const result = stmt.all(...params);
      return { rows: result };
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }
};

export { db, pool };

