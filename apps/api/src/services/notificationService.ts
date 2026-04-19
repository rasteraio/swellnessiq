import { prisma } from '../lib/database';
import { logger } from '../lib/logger';

interface NotificationPayload {
  type: string;
  title: string;
  body: string;
  channel: 'PUSH' | 'SMS' | 'EMAIL' | 'IN_APP';
  data?: Record<string, unknown>;
  scheduledAt?: Date;
}

export class NotificationService {

  static async sendToPatient(patientId: string, payload: NotificationPayload): Promise<void> {
    const patient = await prisma.patientProfile.findUnique({
      where: { id: patientId },
      select: { userId: true },
    });

    if (!patient) return;

    await prisma.notification.create({
      data: {
        userId: patient.userId,
        patientId,
        type: payload.type as any,
        channel: payload.channel as any,
        title: payload.title,
        body: payload.body,
        data: (payload.data || {}) as any,
        scheduledAt: payload.scheduledAt || new Date(),
      },
    });

    // In production: dispatch to push notification service (FCM, APNs)
    // or SMS provider (Twilio) or email service (SendGrid)
    logger.info('Notification queued', { patientId, type: payload.type, channel: payload.channel });
  }

  static async sendModuleAvailableNotification(patientId: string, moduleTitle: string, moduleId: string): Promise<void> {
    await NotificationService.sendToPatient(patientId, {
      type: 'MODULE_AVAILABLE',
      title: 'New lesson available!',
      body: `Your next health lesson is ready: "${moduleTitle}" — takes just 5 minutes.`,
      channel: 'IN_APP',
      data: { moduleId },
    });

    // Also schedule a push notification
    await NotificationService.sendToPatient(patientId, {
      type: 'MODULE_AVAILABLE',
      title: 'New lesson available!',
      body: `"${moduleTitle}" is ready for you.`,
      channel: 'PUSH',
      data: { moduleId },
    });
  }

  static async scheduleModuleReminder(
    patientId: string,
    moduleTitle: string,
    moduleId: string,
    reminderDate: Date
  ): Promise<void> {
    await NotificationService.sendToPatient(patientId, {
      type: 'MODULE_REMINDER',
      title: 'Reminder: Complete your health lesson',
      body: `Don't forget: "${moduleTitle}" is still waiting for you.`,
      channel: 'IN_APP',
      data: { moduleId },
      scheduledAt: reminderDate,
    });
  }

  static async sendStreakMilestone(patientId: string, streakDays: number): Promise<void> {
    const messages: Record<number, string> = {
      3: "3-day streak! You're building a great habit.",
      7: "One week streak! Your commitment to recovery is inspiring.",
      14: "Two weeks strong! Keep up the excellent work.",
      30: "30-day milestone! You're a true health champion.",
    };

    const message = messages[streakDays];
    if (!message) return;

    await NotificationService.sendToPatient(patientId, {
      type: 'STREAK_MILESTONE',
      title: `${streakDays}-day streak!`,
      body: message,
      channel: 'IN_APP',
      data: { streakDays },
    });
  }

  static async getPendingNotifications(userId: string): Promise<any[]> {
    return prisma.notification.findMany({
      where: {
        userId,
        isRead: false,
        OR: [
          { scheduledAt: null },
          { scheduledAt: { lte: new Date() } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }
}
