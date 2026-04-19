import { Response, NextFunction } from 'express';
import { AuthRequest } from './authenticate';
import { prisma } from '../lib/database';
import { logger } from '../lib/logger';

// HIPAA-compliant audit logging for PHI access
const AUDITED_ROUTES = [
  { pattern: /^\/api\/v1\/patients/, resource: 'PATIENT' },
  { pattern: /^\/api\/v1\/vitals/, resource: 'VITAL' },
  { pattern: /^\/api\/v1\/messages/, resource: 'MESSAGE' },
  { pattern: /^\/api\/v1\/chat/, resource: 'CHAT' },
  { pattern: /^\/api\/v1\/alerts/, resource: 'ALERT' },
];

export function auditLogger(req: AuthRequest, res: Response, next: NextFunction): void {
  const matched = AUDITED_ROUTES.find(r => r.pattern.test(req.path));
  if (!matched) return next();

  res.on('finish', () => {
    const userId = req.user?.userId;
    if (!userId) return;

    const resourceId = req.params.id || req.params.patientId;

    prisma.auditLog.create({
      data: {
        userId,
        action: `${req.method}_${matched.resource}`,
        resourceType: matched.resource,
        resourceId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: {
          path: req.path,
          statusCode: res.statusCode,
          requestId: req.headers['x-request-id'],
        },
      },
    }).catch((err) => logger.error('Audit log failed', { error: err.message }));
  });

  next();
}
