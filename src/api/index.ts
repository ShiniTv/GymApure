import { asyncRouter } from './middleware/asyncRouter.ts';
import authRoutes from './auth.ts';
import healthRoutes from './health.ts';
import userRoutes from './users.ts';
import membershipRoutes from './memberships.ts';
import paymentRoutes from './payments.ts';
import attendanceRoutes from './attendance.ts';
import routineRoutes from './routines.ts';
import workoutRoutes from './workouts.ts';
import exerciseRoutes from './exercises.ts';
import statsRoutes from './stats.ts';
import auditLogsRoutes from './auditLogs.ts';
import settingsRoutes from './settings.ts';
import fileRoutes from './files.ts';
import reportsRoutes from './reports.ts';
import receptionRoutes from './reception.ts';
import { authenticate } from './middleware/auth.ts';
import { apiRateLimiter, authRateLimiter } from './middleware/rateLimit.ts';

const router = asyncRouter();

// Health (public, no auth)
router.use(healthRoutes);

// Public routes (rate-limited)
router.use('/auth', authRateLimiter, authRoutes);

// Protected routes (require login)
router.use(apiRateLimiter);
router.use(authenticate);

router.use('/users', userRoutes);
router.use('/memberships', membershipRoutes);
router.use('/payments', paymentRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/routines', routineRoutes);
router.use('/workouts', workoutRoutes);
router.use('/exercises', exerciseRoutes);
router.use('/stats', statsRoutes);
router.use('/settings', settingsRoutes);
router.use('/audit-logs', auditLogsRoutes);
router.use('/reports', reportsRoutes);
router.use('/reception', receptionRoutes);
router.use('/files', fileRoutes);

router.use((_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

export default router;
