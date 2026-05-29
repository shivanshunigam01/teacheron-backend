import { Router } from 'express';
import * as c from '../controllers/certificate.controller.js';
import { verifyJWT, requireRole } from '../middleware/auth.middleware.js';

const r = Router();

r.get('/verify/:serial', c.getByNumber);
r.get('/me', verifyJWT, c.mine);
r.get('/', verifyJWT, requireRole('admin'), c.list);
r.get('/:id', verifyJWT, c.getById);

export default r;
