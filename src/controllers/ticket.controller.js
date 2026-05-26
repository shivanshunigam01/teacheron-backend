export * from './ticket.base.controller.js';
import Ticket from '../models/Ticket.model.js';import {ApiResponse} from '../utils/ApiResponse.js';import {asyncHandler} from '../utils/asyncHandler.js';import {toJSON} from '../utils/serialize.js';
export const addMessage=asyncHandler(async(req,res)=>{const t=await Ticket.findByIdAndUpdate(req.params.id,{$push:{messages:{authorId:req.user.id,authorRole:req.user.role,body:req.body.body}}},{new:true});ApiResponse.ok(res,toJSON(t),'Message added');});
