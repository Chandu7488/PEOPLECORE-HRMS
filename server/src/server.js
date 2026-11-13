import app from './app.js';
import { ENV } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';

const startServer = async () => {
  try {
    await connectDB();

    const server = app.listen(ENV.PORT, () => {
      console.log(`🚀 PeopleCore HRMS API running in ${ENV.NODE_ENV} mode on port ${ENV.PORT}`);
      console.log(`📡 Health endpoint: http://localhost:${ENV.PORT}/api/v1/health`);
    });

    const shutdown = async (signal) => {
      console.log(`\nReceived ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        await disconnectDB();
        console.log('HTTP server closed.');
        process.exit(0);
      });

      // Force close after 10 seconds if not closed
      setTimeout(() => {
        console.error('Forced shutdown due to timeout.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error('Fatal error starting server:', error);
    process.exit(1);
  }
};

startServer();
