-- Three-Tier App Database Schema
-- Run this on your RDS MySQL instance before first deployment

CREATE DATABASE IF NOT EXISTS appdb;
USE appdb;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100)  NOT NULL,
  email      VARCHAR(100)  NOT NULL UNIQUE,
  password   VARCHAR(255)  NOT NULL,              -- bcrypt hashed
  created_at TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email)
);

-- Optional: seed a test user (password = Test@1234)
-- bcrypt hash of 'Test@1234' with 12 rounds
INSERT IGNORE INTO users (name, email, password) VALUES
  ('Test User', 'test@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/Lewzle4nZdPTJEXeS');
