import { Router } from 'express';
import * as c from '../controllers/tutor.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { tutorListQuerySchema, tutorIdParamSchema } from '../validators/teacher.validator.js';

const r = Router();

r.get('/facets', c.tutorFacets);
r.get('/', validate(tutorListQuerySchema), c.listTutors);
r.get('/:id', validate(tutorIdParamSchema), c.getTutorById);

export default r;
