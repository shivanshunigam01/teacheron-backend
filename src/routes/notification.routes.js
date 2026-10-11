import { Router } from 'express';
import * as c from '../controllers/notification.controller.js';
import { verifyJWT, requireRole } from '../middleware/auth.middleware.js';

const r = Router();

r.get('/me', verifyJWT, c.listMine);
r.get('/', verifyJWT, requireRole('admin'), c.list);
r.post('/', verifyJWT, requireRole('admin'), c.create);
r.get('/:id', verifyJWT, c.getById);
r.patch('/:id', verifyJWT, c.update);
r.patch('/:id/read', verifyJWT, c.markRead);
r.delete('/:id', verifyJWT, c.remove);

export default r;
