
import sqlite3 from 'sqlite3';
import { open, type Database } from 'sqlite';
import path from 'path';

let db: Database<sqlite3.Database, sqlite3.Statement> | null = null;

// Function to initialize the database connection and create table if it doesn't exist
async function initializeDatabase() {
    // In a serverless environment, the filesystem might be ephemeral.
    // For development, this places the DB in the project root.
    // For production (e.g., Vercel), it might go into a temporary `/tmp` directory.
    const dbPath = process.env.NODE_ENV === 'production' 
      ? path.join('/tmp', 'sangsaddb.sqlite') 
      : path.join(process.cwd(), 'sangsaddb.sqlite');
      
    console.log(`Using database at: ${dbPath}`);

    const newDb = await open({
        filename: dbPath,
        driver: sqlite3.Database,
    });

    // Use TEXT for dates to store ISO 8601 strings, which is standard for SQLite.
    await newDb.exec(`
        CREATE TABLE IF NOT EXISTS monitoring_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            website_id TEXT NOT NULL,
            checked_at TEXT NOT NULL,
            status TEXT NOT NULL,
            latency INTEGER NOT NULL,
            http_response TEXT,
            location TEXT
        );
    `);
    
    return newDb;
}

// Singleton pattern to get the database instance
async function getDb() {
  if (!db) {
    db = await initializeDatabase();
  }
  return db;
}


export async function query(sql: string, params: any[] = []) {
  const dbInstance = await getDb();
  try {
    // Use `all` for SELECT queries, and `run` for INSERT/UPDATE/DELETE
    if (sql.trim().toUpperCase().startsWith('SELECT')) {
      return await dbInstance.all(sql, params);
    } else {
      return await dbInstance.run(sql, params);
    }
  } catch (error) {
    console.error("Database query failed:", { sql, params, error });
    throw new Error('Failed to execute database query.');
  }
}

// In a serverless environment, there's no persistent "app" to close the pool on shutdown.
// The connection is typically managed per-invocation. So a closePool function is less relevant.
// However, if running on a long-lived server, you might want to handle graceful shutdowns.
export async function closePool() {
  if (db) {
    await db.close();
    db = null;
  }
}
