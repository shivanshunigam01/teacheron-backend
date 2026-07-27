import { Router } from 'express';
import * as c from '../controllers/payment.controller.js';
import { verifyJWT, requireProfileComplete } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { createOrderSchema, verifyPaymentSchema } from '../validators/payment.validator.js';

const r = Router();

r.post('/create-order', verifyJWT, requireProfileComplete, validate(createOrderSchema), c.createOrder);
r.post('/verify-payment', verifyJWT, requireProfileComplete, validate(verifyPaymentSchema), c.verifyPayment);
r.post('/', verifyJWT, requireProfileComplete, c.create);
r.get('/me', verifyJWT, requireProfileComplete, c.mine);
r.get('/received', verifyJWT, requireProfileComplete, c.received);
r.get('/:id', verifyJWT, requireProfileComplete, c.getById);
r.post('/:id/unlock-contact', verifyJWT, requireProfileComplete, c.unlock);

export default r;
