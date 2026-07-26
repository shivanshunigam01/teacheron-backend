import { Router } from 'express';
import * as c from '../controllers/platform.controller.js';
import { verifyJWT, requireRole } from '../middleware/auth.middleware.js';

const r = Router();

r.get('/stats', c.stats);
r.get('/recommendations', c.recommendations);
r.post('/gamification/refresh-top-ten', verifyJWT, requireRole('admin'), c.refreshGamification);

export default r;
