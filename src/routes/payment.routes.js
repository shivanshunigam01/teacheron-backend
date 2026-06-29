import { Router } from 'express';
import * as c from '../controllers/payment.controller.js';
import { verifyJWT } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { createOrderSchema, verifyPaymentSchema } from '../validators/payment.validator.js';

const r = Router();

r.post('/create-order', verifyJWT, validate(createOrderSchema), c.createOrder);
r.post('/verify-payment', verifyJWT, validate(verifyPaymentSchema), c.verifyPayment);
r.post('/', verifyJWT, c.create);
r.get('/me', verifyJWT, c.mine);
r.get('/:id', verifyJWT, c.getById);
r.post('/:id/unlock-contact', verifyJWT, c.unlock);

export default r;
