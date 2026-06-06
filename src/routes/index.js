import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import categoryRoutes from './category.routes.js';
import courseRoutes from './course.routes.js';
import enrollmentRoutes from './enrollment.routes.js';
import certificateRoutes from './certificate.routes.js';
import reviewRoutes from './review.routes.js';
import requirementRoutes from './requirement.routes.js';
import proposalRoutes from './proposal.routes.js';
import paymentRoutes from './payment.routes.js';
import marketplaceRoutes from './marketplace.routes.js';
import accommodationRoutes from './accommodation.routes.js';
import ticketRoutes from './ticket.routes.js';
import notificationRoutes from './notification.routes.js';
import adminRoutes from './admin.routes.js';
import bannerRoutes from './banner.routes.js';
import geoRoutes from './geo.routes.js';
import uploadRoutes from './upload.routes.js';
import contactRoutes from './contact.routes.js';
import workshopRoutes from './workshop.routes.js';
import teacherRoutes from './teacher.routes.js';
import tutorRoutes from './tutor.routes.js';
import { dbState } from '../config/db.js';

const router = Router();

router.get('/health', (req, res) =>
  res.json({
    success: true,
    message: 'TeacherPoint API is running',
    db: dbState(),
    routes: {
      auth: {
        register: 'POST /api/v1/auth/register',
        login: 'POST /api/v1/auth/login',
        me: 'GET /api/v1/auth/me',
      },
    },
  }),
);

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/categories', categoryRoutes);
router.use('/courses', courseRoutes);
router.use('/enrollments', enrollmentRoutes);
router.use('/certificates', certificateRoutes);
router.use('/reviews', reviewRoutes);
router.use('/requirements', requirementRoutes);
router.use('/proposals', proposalRoutes);
router.use('/payments', paymentRoutes);
router.use('/listings', marketplaceRoutes);
router.use('/accommodations', accommodationRoutes);
router.use('/tickets', ticketRoutes);
router.use('/notifications', notificationRoutes);
router.use('/admin', adminRoutes);
router.use('/banners', bannerRoutes);
router.use('/geo', geoRoutes);
router.use('/upload', uploadRoutes);
router.use('/contact', contactRoutes);
router.use('/workshops', workshopRoutes);
router.use('/teacher', teacherRoutes);
router.use('/tutors', tutorRoutes);

export default router;
