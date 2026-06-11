import { Router } from 'express';
import * as c from '../controllers/subject.controller.js';
import { verifyJWT, requireRole } from '../middleware/auth.middleware.js';

const r = Router();

r.get('/popular', c.popular);
r.get('/', c.list);
r.get('/:slug', c.getBySlug);
r.post('/', verifyJWT, requireRole('admin'), c.create);
r.patch('/:id', verifyJWT, requireRole('admin'), c.update);
r.delete('/:id', verifyJWT, requireRole('admin'), c.remove);

export default r;
