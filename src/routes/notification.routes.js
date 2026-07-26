import { Router } from 'express';
import * as c from '../controllers/notification.controller.js';
import { verifyJWT, optionalJWT } from '../middleware/auth.middleware.js';

const r = Router();

r.get('/me', verifyJWT, c.listMine);
r.get('/', optionalJWT, c.list);
r.post('/', verifyJWT, c.create);
r.get('/:id', optionalJWT, c.getById);
r.patch('/:id', verifyJWT, c.update);
r.patch('/:id/read', verifyJWT, c.markRead);
r.delete('/:id', verifyJWT, c.remove);

export default r;
