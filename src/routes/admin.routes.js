import { Router } from 'express';
import * as c from '../controllers/admin.controller.js';
import * as users from '../controllers/adminUsers.controller.js';
import * as banner from '../controllers/banner.controller.js';
import * as ipMonitor from '../controllers/ipMonitor.controller.js';
import { verifyJWT, requireRole } from '../middleware/auth.middleware.js';
import { requirePermission, requireAnyPermission } from '../middleware/permission.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { adminCreateUserSchema, adminUpdateUserSchema } from '../validators/admin.validator.js';
import { createBannerSchema, updateBannerSchema } from '../validators/banner.validator.js';
import * as workshop from '../controllers/workshop.controller.js';
import {
  workshopRejectSchema,
  workshopStatusSchema,
  workshopIdParamSchema,
  workshopListQuerySchema,
} from '../validators/workshop.validator.js';
import * as tutorAdmin from '../controllers/tutor.controller.js';
import {
  adminTeacherListQuerySchema,
  adminTeacherStatusSchema,
} from '../validators/teacher.validator.js';
import * as requirement from '../controllers/requirement.controller.js';
import {
  adminApproveRequirementSchema,
  adminListRequirementsQuerySchema,
  adminRejectRequirementSchema,
} from '../validators/requirement.validator.js';
import * as subject from '../controllers/subject.controller.js';
import {
  adminSubjectListQuerySchema,
  adminSubjectStatusSchema,
} from '../validators/subject.validator.js';
import {
  adminProposalListQuerySchema,
  adminProposalReviewSchema,
  adminProposalRejectSchema,
  proposalIdParamSchema,
} from '../validators/proposal.validator.js';
import * as proposal from '../controllers/proposal.controller.js';
import * as connection from '../controllers/connection.controller.js';
import * as accommodationInquiry from '../controllers/accommodationInquiry.controller.js';
import {
  adminAccommodationInquiryListSchema,
  adminAccommodationInquiryStatusSchema,
  accommodationInquiryIdParamSchema,
  accommodationInquiryMessageSchema,
} from '../validators/accommodationInquiry.validator.js';
import {
  adminConnectionListQuerySchema,
  adminConnectionReviewSchema,
  adminConnectionRejectSchema,
  connectionIdParamSchema,
} from '../validators/connection.validator.js';

const r = Router();
r.use(verifyJWT, requireRole('admin'));

r.get('/stats', requireAnyPermission('reports.read', 'users.read'), c.stats);
r.get('/users', requirePermission('users.read'), users.listUsers);
r.post('/users', requirePermission('users.write'), validate(adminCreateUserSchema), users.createUser);
r.patch('/users/:id', requirePermission('users.write'), validate(adminUpdateUserSchema), users.updateUser);
r.delete('/users/:id', requirePermission('users.write'), users.deleteUser);
r.get('/team', requirePermission('team.read'), c.team);
r.post('/team', requirePermission('team.invite'), c.invite);
r.get('/reports', requirePermission('reports.read'), c.reports);
r.patch('/reports/:id', requirePermission('reports.resolve'), c.updateReport);
r.get('/smtp-config', requirePermission('smtp.read'), c.getSmtp);
r.patch('/smtp-config', requirePermission('smtp.write'), c.updateSmtp);
r.post('/smtp-config/test', requirePermission('smtp.write'), c.testSmtp);
r.post('/notifications', requirePermission('notifications.send'), c.broadcast);
r.get('/banners', requirePermission('banners.read'), banner.list);
r.post('/banners', requirePermission('banners.write'), validate(createBannerSchema), banner.create);
r.patch('/banners/:id', requirePermission('banners.write'), validate(updateBannerSchema), banner.update);
r.delete('/banners/:id', requirePermission('banners.write'), banner.remove);

r.get('/ip-monitor/summary', requirePermission('users.read'), ipMonitor.summary);
r.get('/ip-monitor/groups', requirePermission('users.read'), ipMonitor.groups);
r.get('/ip-monitor/logs', requirePermission('users.read'), ipMonitor.logs);
r.get('/ip-monitor/users/:ipAddress', requirePermission('users.read'), ipMonitor.usersByIp);
r.patch('/ip-monitor/users/:userId/flag', requirePermission('users.write'), ipMonitor.flagUser);

r.get('/workshops', requirePermission('courses.read'), validate(workshopListQuerySchema), workshop.adminList);
r.get('/workshops/:id', requirePermission('courses.read'), validate(workshopIdParamSchema), workshop.adminGetById);
r.patch(
  '/workshops/:id/approve',
  requirePermission('courses.approve'),
  validate(workshopIdParamSchema),
  workshop.adminApprove,
);
r.patch(
  '/workshops/:id/reject',
  requirePermission('courses.approve'),
  validate(workshopRejectSchema),
  workshop.adminReject,
);
r.patch(
  '/workshops/:id/status',
  requirePermission('courses.write'),
  validate(workshopStatusSchema),
  workshop.adminUpdateStatus,
);

r.get('/teachers', requirePermission('users.read'), validate(adminTeacherListQuerySchema), tutorAdmin.listTeachersAdmin);
r.patch(
  '/teachers/:id/status',
  requirePermission('users.write'),
  validate(adminTeacherStatusSchema),
  tutorAdmin.updateTeacherStatus,
);

r.get(
  '/requirements',
  requirePermission('courses.approve'),
  validate(adminListRequirementsQuerySchema),
  requirement.adminList,
);
r.patch(
  '/requirements/:id/approve',
  requirePermission('courses.approve'),
  validate(adminApproveRequirementSchema),
  requirement.adminApprove,
);
r.patch(
  '/requirements/:id/reject',
  requirePermission('courses.approve'),
  validate(adminRejectRequirementSchema),
  requirement.adminReject,
);

r.get('/subjects', requirePermission('courses.read'), validate(adminSubjectListQuerySchema), subject.adminList);
r.patch(
  '/subjects/:id/status',
  requirePermission('courses.write'),
  validate(adminSubjectStatusSchema),
  subject.adminUpdateStatus,
);

r.get(
  '/accommodation-inquiries',
  requirePermission('accommodations.read'),
  validate(adminAccommodationInquiryListSchema),
  accommodationInquiry.adminList,
);
r.get(
  '/accommodation-inquiries/:id',
  requirePermission('accommodations.read'),
  validate(accommodationInquiryIdParamSchema),
  accommodationInquiry.adminGetById,
);
r.post(
  '/accommodation-inquiries/:id/messages',
  requirePermission('accommodations.write'),
  validate(accommodationInquiryMessageSchema),
  accommodationInquiry.adminReply,
);
r.patch(
  '/accommodation-inquiries/:id/status',
  requirePermission('accommodations.write'),
  validate(adminAccommodationInquiryStatusSchema),
  accommodationInquiry.adminUpdateStatus,
);

r.get(
  '/job-applications',
  requirePermission('courses.approve'),
  validate(adminProposalListQuerySchema),
  proposal.adminList,
);
r.get(
  '/job-applications/:id',
  requirePermission('courses.approve'),
  validate(proposalIdParamSchema),
  proposal.adminGetById,
);
r.patch(
  '/job-applications/:id/approve',
  requirePermission('courses.approve'),
  validate(adminProposalReviewSchema),
  proposal.adminApprove,
);
r.patch(
  '/job-applications/:id/reject',
  requirePermission('courses.approve'),
  validate(adminProposalRejectSchema),
  proposal.adminReject,
);

r.get(
  '/connections',
  requirePermission('courses.approve'),
  validate(adminConnectionListQuerySchema),
  connection.adminList,
);
r.get(
  '/connections/:id',
  requirePermission('courses.approve'),
  validate(connectionIdParamSchema),
  connection.adminGetById,
);
r.patch(
  '/connections/:id/approve',
  requirePermission('courses.approve'),
  validate(adminConnectionReviewSchema),
  connection.adminApprove,
);
r.patch(
  '/connections/:id/reject',
  requirePermission('courses.approve'),
  validate(adminConnectionRejectSchema),
  connection.adminReject,
);

export default r;
