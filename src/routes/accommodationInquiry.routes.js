import { Router } from 'express';
import * as c from '../controllers/accommodationInquiry.controller.js';
import { verifyJWT, requireRole } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  accommodationInquiryIdParamSchema,
  accommodationInquirySendSchema,
} from '../validators/accommodationInquiry.validator.js';

const r = Router();

r.use(verifyJWT, requireRole('student', 'teacher', 'admin'));

r.get('/me', requireRole('student', 'teacher'), c.listMine);
r.get('/by-accommodation/:accommodationId', c.getByAccommodation);
r.post(
  '/by-accommodation/:accommodationId/messages',
  validate(accommodationInquirySendSchema),
  requireRole('student', 'teacher'),
  c.sendToAccommodation,
);
r.get('/:id', validate(accommodationInquiryIdParamSchema), c.getById);

export default r;
