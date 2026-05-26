import { Router } from 'express';
import * as c from '../controllers/admin.controller.js';
import * as users from '../controllers/adminUsers.controller.js';
import * as banner from '../controllers/banner.controller.js';
import { verifyJWT, requireRole } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { adminCreateUserSchema, adminUpdateUserSchema } from '../validators/admin.validator.js';

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
r.post('/notifications', c.broadcast);
r.get('/banners', banner.list);
r.post('/banners', banner.create);
r.patch('/banners/:id', banner.update);
r.delete('/banners/:id', banner.remove);

export default r;
