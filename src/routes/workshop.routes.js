import { Router } from 'express';
import * as c from '../controllers/workshop.controller.js';
import { verifyJWT, requireRole, optionalJWT, requireProfileComplete } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  workshopRequestSchema,
  workshopListQuerySchema,
  workshopIdParamSchema,
} from '../validators/workshop.validator.js';

const r = Router();

r.get('/', validate(workshopListQuerySchema), c.listPublic);
r.get('/my-workshops', verifyJWT, requireRole('teacher'), requireProfileComplete, c.myWorkshops);
r.post('/request', verifyJWT, requireRole('teacher'), requireProfileComplete, validate(workshopRequestSchema), c.requestWorkshop);
r.get('/:id', optionalJWT, validate(workshopIdParamSchema), c.getById);
r.post('/:id/register', verifyJWT, requireRole('student'), requireProfileComplete, validate(workshopIdParamSchema), c.register);

export default r;
