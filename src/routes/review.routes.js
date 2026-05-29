import { Router } from 'express';
import * as c from '../controllers/review.controller.js';
import { verifyJWT } from '../middleware/auth.middleware.js';

const r = Router();

r.get('/summary', c.summary);
r.get('/', c.list);
r.post('/', verifyJWT, c.create);
r.get('/:id', c.getById);
r.delete('/:id', verifyJWT, c.remove);

export default r;
