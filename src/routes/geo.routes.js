import { Router } from 'express';
import * as c from '../controllers/geo.controller.js';

const r = Router();

/**
 * @swagger
 * /geo/ip:
 *   get:
 *     summary: Resolve visitor location from IP
 *     tags: [Geo]
 */
r.get('/ip', c.ip);

/**
 * @swagger
 * /geo/reverse:
 *   get:
 *     summary: Reverse geocode coordinates
 *     tags: [Geo]
 */
r.get('/reverse', c.reverse);

/**
 * @swagger
 * /geo/currency:
 *   get:
 *     summary: Resolve currency from visitor IP or country code
 *     tags: [Geo]
 *     parameters:
 *       - in: query
 *         name: countryCode
 *         schema:
 *           type: string
 *         description: Optional ISO country code (e.g. IN, GB, US)
 */
r.get('/currency', c.currency);

export default r;
