
import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;

function getPool() {
  if (pool) {
    return pool;
  }

  const dbConfig: mysql.PoolOptions = {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'sangsaddb',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  };
  
  if (!process.env.MYSQL_DATABASE) {
    console.warn("MYSQL_DATABASE environment variable not set. Using default 'sangsaddb'.");
  }

  pool = mysql.createPool(dbConfig);
  return pool;
}

export async function query(sql: string, params: any[] = []) {
  const dbPool = getPool();
  try {
    const [results] = await dbPool.execute(sql, params);
    return results;
  } catch (error) {
    console.error("Database query failed:", error);
    throw new Error('Failed to execute database query.');
  }
}

// Helper to close the connection pool when the app shuts down
export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
