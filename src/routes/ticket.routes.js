import { Router } from 'express';
import * as c from '../controllers/ticket.controller.js';
import { verifyJWT, requireProfileComplete } from '../middleware/auth.middleware.js';

const r = Router();

r.use(verifyJWT, requireProfileComplete);
r.get('/', c.list);
r.post(
  '/',
  (req, res, next) => {
    req.body.ticketNumber = req.body.ticketNumber || `#${Date.now()}`;
    next();
  },
  c.create,
);
r.get('/:id', c.getById);
r.patch('/:id', c.update);
r.post('/:id/messages', c.addMessage);

export default r;
