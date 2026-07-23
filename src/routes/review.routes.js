import { Router } from 'express';
import * as c from '../controllers/review.controller.js';
import { verifyJWT, requireProfileComplete } from '../middleware/auth.middleware.js';

const r = Router();

r.get('/summary', c.summary);
r.get('/', c.list);
r.post('/', verifyJWT, requireProfileComplete, c.create);
r.get('/:id', c.getById);
r.delete('/:id', verifyJWT, requireProfileComplete, c.remove);

export default r;
