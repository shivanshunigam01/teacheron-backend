import { Router } from 'express';
import * as c from '../controllers/conversation.controller.js';
import { verifyJWT, requireProfileComplete } from '../middleware/auth.middleware.js';

const r = Router();

r.use(verifyJWT, requireProfileComplete);

r.get('/', c.listMine);
r.post('/', c.getOrCreate);
r.get('/:id/messages', c.listMessages);
r.post('/:id/messages', c.sendMessage);

export default r;
