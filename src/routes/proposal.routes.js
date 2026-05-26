import {Router} from 'express';import * as c from '../controllers/proposal.controller.js';import {verifyJWT,requireRole} from '../middleware/auth.middleware.js';const r=Router();
r.get('/',c.list);r.post('/',verifyJWT,c.create);r.get('/:id',c.getById);r.patch('/:id',verifyJWT,c.update);r.delete('/:id',verifyJWT,c.remove);export default r;
