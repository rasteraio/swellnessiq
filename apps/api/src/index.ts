import 'dotenv/config';
import app from './app';
import { logger } from './lib/logger';
import { connectDB } from './lib/database';
import { connectRedis } from './lib/redis';
import { startScheduler } from './jobs/scheduler';

const PORT = parseInt(process.env.PORT || '3001', 10);

async function bootstrap() {
  try {
    await connectDB();
    logger.info('Database connected');

    await connectRedis();
    logger.info('Redis connected');

    startScheduler();
    logger.info('Scheduler started');

    app.listen(PORT, () => {
      logger.info(`Rastera API running on port ${PORT} [${process.env.NODE_ENV}]`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

bootstrap();
