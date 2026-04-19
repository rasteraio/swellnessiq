import { Router, Response, NextFunction } from 'express';
import { prisma } from '../lib/database';
import { authenticate, requireRole, AuthRequest } from '../middleware/authenticate';

const router = Router();
router.use(authenticate, requireRole('CLINICIAN', 'CARE_COORDINATOR', 'ADMIN'));

// GET /api/v1/care-team/my-patients
router.get('/my-patients', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const member = await prisma.careTeamMember.findUnique({
      where: { userId: req.user!.userId },
    });

    if (!member) {
      return res.json({ success: true, data: [] });
    }

    const patients = await prisma.patientProfile.findMany({
      where: { careTeamId: member.careTeamId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        comorbidities: true,
        alerts: { where: { isAcknowledged: false }, select: { id: true, severity: true, type: true } },
        _count: { select: { progress: true } },
      },
      orderBy: [{ riskScore: 'desc' }, { engagementLevel: 'asc' }],
    });

    res.json({ success: true, data: patients });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/care-team/dashboard
router.get('/dashboard', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const member = await prisma.careTeamMember.findUnique({
      where: { userId: req.user!.userId },
    });

    const teamId = member?.careTeamId;

    const [
      totalPatients,
      highRiskPatients,
      unresolvedAlerts,
      atRiskEngagement,
    ] = await Promise.all([
      prisma.patientProfile.count({ where: teamId ? { careTeamId: teamId } : {} }),
      prisma.patientProfile.count({ where: { riskScore: { gte: 70 }, ...(teamId ? { careTeamId: teamId } : {}) } }),
      prisma.alert.count({ where: { isAcknowledged: false, severity: { in: ['HIGH', 'CRITICAL'] } } }),
      prisma.patientProfile.count({ where: { engagementLevel: { in: ['LOW', 'AT_RISK'] }, ...(teamId ? { careTeamId: teamId } : {}) } }),
    ]);

    res.json({
      success: true,
      data: { totalPatients, highRiskPatients, unresolvedAlerts, atRiskEngagement },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
