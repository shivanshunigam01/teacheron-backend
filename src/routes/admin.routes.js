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

export default r;
