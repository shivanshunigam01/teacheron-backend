import jwt from 'jsonwebtoken';import env from '../config/env.js';
export const signAccess=(userId,role,email)=>jwt.sign({sub:userId,role,email},env.JWT_ACCESS_SECRET,{expiresIn:env.JWT_ACCESS_EXPIRES});
export const signRefresh=(userId)=>jwt.sign({sub:userId},env.JWT_REFRESH_SECRET,{expiresIn:env.JWT_REFRESH_EXPIRES});
export const verifyAccess=t=>jwt.verify(t,env.JWT_ACCESS_SECRET);export const verifyRefresh=t=>jwt.verify(t,env.JWT_REFRESH_SECRET);
