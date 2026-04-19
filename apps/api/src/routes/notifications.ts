import { Router, Response, NextFunction } from 'express';
import { prisma } from '../lib/database';
import { authenticate, AuthRequest } from '../middleware/authenticate';
import { NotificationService } from '../services/notificationService';

const router = Router();
router.use(authenticate);

// GET /api/v1/notifications
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const notifications = await NotificationService.getPendingNotifications(req.user!.userId);
    res.json({ success: true, data: notifications });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/notifications/:id/read
router.patch('/:id/read', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.notification.update({
      where: { id: req.params.id, userId: req.user!.userId },
      data: { isRead: true, readAt: new Date() },
    });
    res.json({ success: true, data: { message: 'Marked as read' } });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/notifications/mark-all-read
router.post('/mark-all-read', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    res.json({ success: true, data: { message: 'All notifications marked as read' } });
  } catch (err) {
    next(err);
  }
});

export default router;
