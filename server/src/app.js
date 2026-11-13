import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import { ENV } from './config/env.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './modules/auth/auth.routes.js';
import organizationRoutes from './modules/organization/organization.routes.js';
import employeeRoutes from './modules/employees/employee.routes.js';
import holidayRoutes from './modules/holidays/holiday.routes.js';
import noticeRoutes from './modules/notices/notice.routes.js';
import { leaveRoutes } from './modules/leave/leave.routes.js';
import { attendanceRoutes } from './modules/attendance/attendance.routes.js';
import { payrollRoutes } from './modules/payroll/payroll.routes.js';
import { recruitmentRoutes } from './modules/recruitment/recruitment.routes.js';
import { offboardingRoutes } from './modules/offboarding/offboarding.routes.js';
import { performanceRoutes } from './modules/performance/performance.routes.js';
import { assetRoutes } from './modules/assets/asset.routes.js';
import { expenseRoutes } from './modules/expenses/expense.routes.js';
import { helpdeskRoutes } from './modules/helpdesk/helpdesk.routes.js';
import { reportsRoutes } from './modules/reports/reports.routes.js';
import { auditRoutes } from './modules/audit/audit.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security Middleware (allowing uploaded media / documents to be viewed across ports)
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// Static uploaded documents & files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// CORS Configuration
const allowedOrigins = [
  ENV.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // Dev-friendly fallback
    },
    credentials: true,
  })
);

// Logging
if (ENV.NODE_ENV !== 'test') {
  app.use(morgan(ENV.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// Body parsing Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Health & Liveness Checks
app.get('/api/v1/health', (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;

  res.status(200).json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: ENV.NODE_ENV,
      services: {
        database: isDbConnected ? 'connected' : 'disconnected',
      },
    },
    message: 'PeopleCore HRMS API is operational',
  });
});

app.get('/api/v1/ready', (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;

  if (isDbConnected) {
    return res.status(200).json({
      success: true,
      data: { ready: true },
      message: 'Service is ready to handle traffic',
    });
  }

  return res.status(503).json({
    success: false,
    error: {
      code: 'SERVICE_UNAVAILABLE',
      message: 'Database connection not ready',
      details: [],
    },
  });
});

// Mount Modular Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/organization', organizationRoutes);
app.use('/api/v1/employees', employeeRoutes);
app.use('/api/v1/holidays', holidayRoutes);
app.use('/api/v1/notices', noticeRoutes);
app.use('/api/v1/leave', leaveRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/payroll', payrollRoutes);
app.use('/api/v1/recruitment', recruitmentRoutes);
app.use('/api/v1/offboarding', offboardingRoutes);
app.use('/api/v1/performance', performanceRoutes);
app.use('/api/v1/assets', assetRoutes);
app.use('/api/v1/expenses', expenseRoutes);
app.use('/api/v1/helpdesk', helpdeskRoutes);
app.use('/api/v1/reports', reportsRoutes);
app.use('/api/v1/audit', auditRoutes);

// Root welcome route
app.get('/', (req, res) => {
  res.json({
    name: 'PeopleCore HRMS API',
    version: '1.0.0',
    documentation: '/api/v1/health',
  });
});

// 404 and Error handling
app.use(notFound);
app.use(errorHandler);

export default app;
