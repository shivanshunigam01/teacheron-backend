import { Router } from 'express';
import * as c from '../controllers/user.controller.js';
import { verifyJWT, requireRole, requireProfileComplete } from '../middleware/auth.middleware.js';

const r = Router();

r.get('/tutors/facets', c.tutorsFacets);
r.get('/tutors', c.tutors);
r.get('/tutors/:id', c.tutorDetail);
r.post('/tutors/:id/request-phone', verifyJWT, requireProfileComplete, c.requestTutorPhone);
r.get('/me/saved-tutors', verifyJWT, requireProfileComplete, c.savedTutors);
r.post('/me/saved-tutors/:tutorId', verifyJWT, requireProfileComplete, c.saveTutor);
r.delete('/me/saved-tutors/:tutorId', verifyJWT, requireProfileComplete, c.unsaveTutor);
r.get('/', verifyJWT, requireRole('admin'), c.list);
r.get('/:id', c.getById);
r.patch('/:id', verifyJWT, c.update);

export default r;
