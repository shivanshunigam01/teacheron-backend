import { Router } from 'express';
import * as c from '../controllers/proposal.controller.js';
import { verifyJWT, requireRole, requireProfileComplete } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createProposalSchema,
  requirementIdParamSchema,
} from '../validators/proposal.validator.js';

const r = Router();

r.use(verifyJWT, requireProfileComplete);

r.get('/me', requireRole('teacher'), c.myApplications);
r.get(
  '/requirement/:requirementId',
  requireRole('teacher'),
  validate(requirementIdParamSchema),
  c.getForRequirement,
);
r.post('/', requireRole('teacher'), validate(createProposalSchema), c.create);

export default r;
