import { Router } from 'express';
import * as c from '../controllers/course.controller.js';
import { verifyJWT, requireRole, requireProfileComplete } from '../middleware/auth.middleware.js';

const r = Router();

r.get('/', c.list);
r.post('/', verifyJWT, requireRole('teacher', 'admin'), requireProfileComplete, c.create);
r.get('/:id', c.getById);
r.patch('/:id', verifyJWT, requireRole('teacher', 'admin'), requireProfileComplete, c.update);
r.delete('/:id', verifyJWT, requireRole('teacher', 'admin'), requireProfileComplete, c.remove);
r.get('/:id/curriculum', c.curriculum);
r.post('/:id/modules', verifyJWT, requireRole('teacher', 'admin'), requireProfileComplete, c.addModule);
r.patch(
  '/:id/modules/:moduleId',
  verifyJWT,
  requireRole('teacher', 'admin'),
  requireProfileComplete,
  c.updateModule,
);
r.delete(
  '/:id/modules/:moduleId',
  verifyJWT,
  requireRole('teacher', 'admin'),
  requireProfileComplete,
  c.deleteModule,
);

export default r;
