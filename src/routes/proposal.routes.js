import { Router } from 'express';
import * as c from '../controllers/proposal.controller.js';
import { verifyJWT, requireRole } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createProposalSchema,
  requirementIdParamSchema,
} from '../validators/proposal.validator.js';

const r = Router();

r.use(verifyJWT);

r.get('/me', requireRole('teacher'), c.myApplications);
r.get(
  '/requirement/:requirementId',
  requireRole('teacher'),
  validate(requirementIdParamSchema),
  c.getForRequirement,
);
r.post('/', requireRole('teacher'), validate(createProposalSchema), c.create);

export default r;
