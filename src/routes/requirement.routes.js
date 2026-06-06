import { Router } from 'express';
import * as c from '../controllers/requirement.controller.js';
import { verifyJWT, requireRole, optionalJWT } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  adminApproveRequirementSchema,
  adminListRequirementsQuerySchema,
  adminRejectRequirementSchema,
  createRequirementSchema,
  listJobsQuerySchema,
  requirementIdParamSchema,
} from '../validators/requirement.validator.js';

const r = Router();

/**
 * @swagger
 * /requirements/jobs:
 *   get:
 *     summary: List approved tutor jobs (public)
 *     tags: [Requirements]
 */
r.get('/jobs', validate(listJobsQuerySchema), c.listJobs);

/**
 * @swagger
 * /requirements/facets:
 *   get:
 *     summary: Tutor job filter facets
 *     tags: [Requirements]
 */
r.get('/facets', c.jobFacets);

r.get('/me', verifyJWT, requireRole('student', 'parent'), c.listMine);

r.post('/', verifyJWT, requireRole('student', 'parent'), validate(createRequirementSchema), c.create);

r.get('/:id', optionalJWT, validate(requirementIdParamSchema), c.getById);

export default r;
