import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient = global.__prisma ?? new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
});

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

prisma.$on('error', (e) => {
  logger.error('Prisma error', { message: e.message, target: e.target });
});

prisma.$on('warn', (e) => {
  logger.warn('Prisma warning', { message: e.message });
});

export async function connectDB(): Promise<void> {
  await prisma.$connect();
}

export async function disconnectDB(): Promise<void> {
  await prisma.$disconnect();
}
