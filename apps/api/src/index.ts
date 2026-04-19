import 'dotenv/config';
import app from './app';
import { logger } from './lib/logger';
import { connectDB } from './lib/database';
import { connectRedis } from './lib/redis';
import { startScheduler } from './jobs/scheduler';

const PORT = parseInt(process.env.PORT || '3001', 10);

async function bootstrap() {
  // Bind port first so Railway health check can hit /health immediately
  app.listen(PORT, () => {
    logger.info(`SwellnessIQ API running on port ${PORT} [${process.env.NODE_ENV}]`);
  });

  // Connect to database (fatal — API cannot work without it)
  try {
    await connectDB();
    logger.info('Database connected');
  } catch (error) {
    logger.error('Database connection failed', { error });
    process.exit(1);
  }

  // Connect to Redis (non-fatal — cache degrades gracefully)
  try {
    await connectRedis();
    logger.info('Redis connected');
  } catch (error) {
    logger.warn('Redis unavailable — running without cache', { error });
  }

  startScheduler();
  logger.info('Scheduler started');
}

bootstrap();
