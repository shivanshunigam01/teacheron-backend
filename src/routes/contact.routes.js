import { Router } from 'express';
import { contact } from '../controllers/contact.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { contactSchema } from '../validators/contact.validator.js';
import { apiRateLimit } from '../middleware/rateLimit.middleware.js';

const r = Router();

r.post('/', apiRateLimit, validate(contactSchema), contact);

export default r;
