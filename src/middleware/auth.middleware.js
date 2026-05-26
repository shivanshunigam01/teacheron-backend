import {ApiError} from '../utils/ApiError.js';import * as tokenService from '../services/token.service.js';
export const verifyJWT=(req,res,next)=>{const h=req.headers.authorization;if(!h?.startsWith('Bearer ')) throw ApiError.unauthorized();const p=tokenService.verifyAccess(h.slice(7));req.user={id:p.sub,role:p.role,email:p.email};next();};
export const optionalJWT=(req,res,next)=>{try{const h=req.headers.authorization;if(h?.startsWith('Bearer ')){const p=tokenService.verifyAccess(h.slice(7));req.user={id:p.sub,role:p.role,email:p.email};}}catch{} next();};
export const requireRole=(...roles)=>(req,res,next)=>{if(!req.user||!roles.includes(req.user.role)) throw ApiError.forbidden();next();};
