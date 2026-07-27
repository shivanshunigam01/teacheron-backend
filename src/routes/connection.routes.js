import { Router } from 'express';
import * as c from '../controllers/connection.controller.js';
import { verifyJWT, requireProfileComplete } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createConnectionSchema,
  connectionIdParamSchema,
} from '../validators/connection.validator.js';

const r = Router();

r.use(verifyJWT, requireProfileComplete);

r.get('/', c.listMine);
r.post('/', validate(createConnectionSchema), c.createOrGet);
r.get('/by-teacher/:teacherId', c.getByTeacher);
r.get('/:id', validate(connectionIdParamSchema), c.getById);

export default r;
