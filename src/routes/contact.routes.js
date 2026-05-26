import {Router} from 'express';import {contact} from '../controllers/contact.controller.js';const r=Router();r.post('/',contact);export default r;
