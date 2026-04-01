const mysql = require('mysql2/promise');
const logger = require('./logger');

let pool;

async function createPool() {
  pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER || 'admin',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'appdb',
    port: parseInt(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000,
  });

  // Test connection
  const conn = await pool.getConnection();
  logger.info(`Connected to RDS MySQL at ${process.env.DB_HOST}`);

  // Create users table if not exists
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  logger.info('Users table verified/created');
  conn.release();

  return pool;
}

function getPool() {
  if (!pool) throw new Error('DB pool not initialized. Call createPool() first.');
  return pool;
}

module.exports = { createPool, getPool };
