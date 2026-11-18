import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb+srv://stockpilot_app:6AEQw8xOgQGlq5cd@stockpilot-cluster.y3hhofr.mongodb.net/peoplecore_hrms?retryWrites=true&w=majority',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'c914e6ad8e2e92389e66bf24a1b023de6701bb74cf5db436a57bf1068ba0999d',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || '7f5309da30c45d3151fa4f90bf4ea7e9095642ba93d182dc74cb0657c91f16f2',
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  COOKIE_SECURE: process.env.COOKIE_SECURE === 'true',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  SMTP_HOST: process.env.SMTP_HOST || '127.0.0.1',
  SMTP_PORT: parseInt(process.env.SMTP_PORT, 10) || 1025,
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  SMTP_FROM: process.env.SMTP_FROM || 'PeopleCore HRMS <no-reply@peoplecore.local>',
};
