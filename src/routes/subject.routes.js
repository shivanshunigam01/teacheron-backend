import { Router } from 'express';
import * as c from '../controllers/subject.controller.js';
import { verifyJWT, requireRole } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createSubjectSchema,
  ensureSubjectSchema,
  updateSubjectSchema,
} from '../validators/subject.validator.js';

const r = Router();

r.get('/popular', c.popular);
r.get('/', c.list);
r.post('/ensure', validate(ensureSubjectSchema), c.ensure);
r.get('/:slug', c.getBySlug);
r.post('/', verifyJWT, requireRole('admin'), validate(createSubjectSchema), c.create);
r.patch('/:id', verifyJWT, requireRole('admin'), validate(updateSubjectSchema), c.update);
r.delete('/:id', verifyJWT, requireRole('admin'), c.remove);

export default r;
