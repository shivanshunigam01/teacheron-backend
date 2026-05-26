import {Router} from 'express';import * as c from '../controllers/banner.controller.js';const r=Router();r.get('/active',c.active);export default r;
