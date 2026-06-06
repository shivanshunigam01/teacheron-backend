import { Router } from 'express';
import * as c from '../controllers/teacher.controller.js';
import { verifyJWT, requireRole } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { teacherProfileUpsertSchema } from '../validators/teacher.validator.js';

const r = Router();

r.get('/profile', verifyJWT, requireRole('teacher'), c.getProfile);
r.post('/profile', verifyJWT, requireRole('teacher'), validate(teacherProfileUpsertSchema), c.createProfile);
r.put('/profile', verifyJWT, requireRole('teacher'), validate(teacherProfileUpsertSchema), c.updateProfile);

export default r;
