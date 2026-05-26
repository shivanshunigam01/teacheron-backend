import {Router} from 'express';import * as c from '../controllers/geo.controller.js';const r=Router();r.get('/ip',c.ip);r.get('/reverse',c.reverse);export default r;
