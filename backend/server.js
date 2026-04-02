require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { getSecret } = require('./utils/secrets');
const { createPool } = require('./utils/db');
const authRoutes = require('./routes/auth');
const logger = require('./utils/logger');

const app = express();
app.use(cors());
app.use(express.json());

// Health check — required by ECS ALB
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'three-tier-backend',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Auth routes
app.use('/api/auth', authRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = parseInt(process.env.PORT) || 5000;

async function startServer() {
  try {
    // Fetch DB password from Secrets Manager (production)
    // Falls back to env var for local development
    if (process.env.NODE_ENV === 'production' && process.env.SECRET_NAME) {
      logger.info('Fetching DB credentials from Secrets Manager...');
      const secret = await getSecret(process.env.SECRET_NAME);
      process.env.DB_PASSWORD = secret.password;
      process.env.DB_USER = secret.username;
      logger.info('Secrets loaded successfully');
    }

    // Initialize DB pool
    await createPool();
    logger.info('Database connection pool created');

    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Backend API running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    logger.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

startServer();