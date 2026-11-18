import app from './app.js';
import { ENV } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';

if (!process.env.VERCEL) {
  connectDB().catch((err) => {
    console.error('Initial MongoDB connection error:', err.message);
  });

  const port = process.env.PORT || ENV.PORT || 5001;

  const server = app.listen(port, () => {
    console.log(`🚀 PeopleCore HRMS API running on port ${port}`);
  });

  const shutdown = async (signal) => {
    console.log(`\nReceived ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      await disconnectDB();
      console.log('HTTP server closed.');
      process.exit(0);
    });

    setTimeout(() => {
      console.error('Forced shutdown due to timeout.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

export default app;
