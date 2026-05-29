import { Router } from 'express';
import * as c from '../controllers/enrollment.controller.js';
import { verifyJWT, requireRole } from '../middleware/auth.middleware.js';

const r = Router();

r.post('/', verifyJWT, requireRole('student'), c.enroll);
r.get('/me', verifyJWT, c.mine);
r.get('/course/:courseId', verifyJWT, c.byCourse);
r.get('/course/:courseId/all', verifyJWT, requireRole('teacher', 'admin'), c.forCourse);
r.get('/:id', verifyJWT, c.getById);
r.post('/:id/progress', verifyJWT, requireRole('student'), c.progress);

export default r;
