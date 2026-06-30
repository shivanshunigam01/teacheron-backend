import { Router } from 'express';
import * as c from '../controllers/admin.controller.js';
import * as users from '../controllers/adminUsers.controller.js';
import * as banner from '../controllers/banner.controller.js';
import * as ipMonitor from '../controllers/ipMonitor.controller.js';
import { verifyJWT, requireRole } from '../middleware/auth.middleware.js';
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
import * as accommodationInquiry from '../controllers/accommodationInquiry.controller.js';
import {
  adminAccommodationInquiryListSchema,
  adminAccommodationInquiryStatusSchema,
  accommodationInquiryIdParamSchema,
  accommodationInquiryMessageSchema,
} from '../validators/accommodationInquiry.validator.js';

const r = Router();
r.use(verifyJWT, requireRole('admin'));

r.get('/stats', c.stats);
r.get('/users', users.listUsers);
r.post('/users', validate(adminCreateUserSchema), users.createUser);
r.patch('/users/:id', validate(adminUpdateUserSchema), users.updateUser);
r.delete('/users/:id', users.deleteUser);
r.get('/team', c.team);
r.post('/team', c.invite);
r.get('/reports', c.reports);
r.patch('/reports/:id', c.updateReport);
r.get('/smtp-config', c.getSmtp);
r.patch('/smtp-config', c.updateSmtp);
r.post('/smtp-config/test', c.testSmtp);
r.post('/notifications', c.broadcast);
r.get('/banners', banner.list);
r.post('/banners', validate(createBannerSchema), banner.create);
r.patch('/banners/:id', validate(updateBannerSchema), banner.update);
r.delete('/banners/:id', banner.remove);

r.get('/ip-monitor/summary', ipMonitor.summary);
r.get('/ip-monitor/groups', ipMonitor.groups);
r.get('/ip-monitor/logs', ipMonitor.logs);
r.get('/ip-monitor/users/:ipAddress', ipMonitor.usersByIp);
r.patch('/ip-monitor/users/:userId/flag', ipMonitor.flagUser);

r.get('/workshops', validate(workshopListQuerySchema), workshop.adminList);
r.get('/workshops/:id', validate(workshopIdParamSchema), workshop.adminGetById);
r.patch('/workshops/:id/approve', validate(workshopIdParamSchema), workshop.adminApprove);
r.patch('/workshops/:id/reject', validate(workshopRejectSchema), workshop.adminReject);
r.patch('/workshops/:id/status', validate(workshopStatusSchema), workshop.adminUpdateStatus);

r.get('/teachers', validate(adminTeacherListQuerySchema), tutorAdmin.listTeachersAdmin);
r.patch('/teachers/:id/status', validate(adminTeacherStatusSchema), tutorAdmin.updateTeacherStatus);

r.get('/requirements', validate(adminListRequirementsQuerySchema), requirement.adminList);
r.patch('/requirements/:id/approve', validate(adminApproveRequirementSchema), requirement.adminApprove);
r.patch('/requirements/:id/reject', validate(adminRejectRequirementSchema), requirement.adminReject);

r.get('/subjects', validate(adminSubjectListQuerySchema), subject.adminList);
r.patch('/subjects/:id/status', validate(adminSubjectStatusSchema), subject.adminUpdateStatus);

r.get(
  '/accommodation-inquiries',
  validate(adminAccommodationInquiryListSchema),
  accommodationInquiry.adminList,
);
r.get(
  '/accommodation-inquiries/:id',
  validate(accommodationInquiryIdParamSchema),
  accommodationInquiry.adminGetById,
);
r.post(
  '/accommodation-inquiries/:id/messages',
  validate(accommodationInquiryMessageSchema),
  accommodationInquiry.adminReply,
);
r.patch(
  '/accommodation-inquiries/:id/status',
  validate(adminAccommodationInquiryStatusSchema),
  accommodationInquiry.adminUpdateStatus,
);

r.get('/job-applications', validate(adminProposalListQuerySchema), proposal.adminList);
r.get('/job-applications/:id', validate(proposalIdParamSchema), proposal.adminGetById);
r.patch('/job-applications/:id/approve', validate(adminProposalReviewSchema), proposal.adminApprove);
r.patch('/job-applications/:id/reject', validate(adminProposalRejectSchema), proposal.adminReject);

export default r;
