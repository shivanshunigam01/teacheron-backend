import { Router } from 'express';
import * as c from '../controllers/marketplace.controller.js';
import { verifyJWT, requireProfileComplete, optionalJWT } from '../middleware/auth.middleware.js';

const r = Router();

r.get('/', optionalJWT, c.list);
r.post('/', verifyJWT, requireProfileComplete, c.create);
r.get('/:id', c.getById);
r.patch('/:id', verifyJWT, requireProfileComplete, c.update);
r.delete('/:id', verifyJWT, requireProfileComplete, c.remove);

export default r;
