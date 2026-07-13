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
import chatRoutes from './chat.ts';
import nutritionRoutes from './nutrition.ts';
import trainerRoutes from './trainers.ts';
import pushSubscriptionRoutes from './pushSubscriptions.ts';
import equipmentRoutes from './equipment.ts';
import notificationRoutes from './notifications.ts';
import exchangeRateRoutes from './exchangeRate.ts';
import cronRoutes from './cronRoutes.ts';
import { authenticate } from './middleware/auth.ts';
import { csrfProtection } from './middleware/csrf.ts';
import { apiRateLimiter, authRateLimiter } from './middleware/rateLimit.ts';

const router = asyncRouter();

// Health (public, no auth)
router.use(healthRoutes);

// Public routes (rate-limited)
router.use('/auth', authRateLimiter, authRoutes);

// Cron jobs (CRON_SECRET or admin session — before global authenticate)
router.use(apiRateLimiter, cronRoutes);

// Protected routes (require login)
router.use(apiRateLimiter);
router.use(authenticate);
router.use(csrfProtection);

router.use('/users', userRoutes);
router.use('/trainers', trainerRoutes);
router.use('/memberships', membershipRoutes);
router.use('/exchange-rate', exchangeRateRoutes);
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
router.use('/chat', chatRoutes);
router.use(nutritionRoutes);
router.use('/files', fileRoutes);
router.use('/push', pushSubscriptionRoutes);
router.use('/notifications', notificationRoutes);
router.use('/equipment', equipmentRoutes);

router.use((_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

export default router;
