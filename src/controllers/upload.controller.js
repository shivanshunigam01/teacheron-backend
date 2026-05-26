import env from '../config/env.js';import {ApiResponse} from '../utils/ApiResponse.js';import {asyncHandler} from '../utils/asyncHandler.js';
export const uploadFile=asyncHandler(async(req,res)=>{const f=req.file;ApiResponse.created(res,{url:`${env.API_BASE_URL}/${f.path.replaceAll('\\','/')}`,filename:f.filename,mimetype:f.mimetype,size:f.size},'File uploaded');});
