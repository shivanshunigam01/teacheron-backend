import { Router } from 'express';
import * as c from '../controllers/enrollment.controller.js';
import { verifyJWT, requireRole, requireProfileComplete } from '../middleware/auth.middleware.js';

const r = Router();

r.post('/', verifyJWT, requireRole('student'), requireProfileComplete, c.enroll);
r.get('/me', verifyJWT, requireProfileComplete, c.mine);
r.get('/course/:courseId', verifyJWT, requireProfileComplete, c.byCourse);
r.get('/course/:courseId/all', verifyJWT, requireRole('teacher', 'admin'), requireProfileComplete, c.forCourse);
r.get('/:id', verifyJWT, requireProfileComplete, c.getById);
r.post('/:id/progress', verifyJWT, requireRole('student'), requireProfileComplete, c.progress);

export default r;
