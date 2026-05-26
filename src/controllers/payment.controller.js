import Payment from '../models/Payment.model.js';import {ApiResponse} from '../utils/ApiResponse.js';import {asyncHandler} from '../utils/asyncHandler.js';import {toJSON,toJSONList} from '../utils/serialize.js';import {createPayment} from '../services/payment.service.js';
export const create=asyncHandler(async(req,res)=>{const p=await createPayment({...req.body,userId:req.user.id});ApiResponse.created(res,{paymentId:p.id,status:p.status,invoiceId:p.invoiceId,checkoutUrl:null},'Payment created');});
export const mine=asyncHandler(async(req,res)=>ApiResponse.ok(res,toJSONList(await Payment.find({userId:req.user.id}).sort('-createdAt')),'Payments fetched'));
export const getById=asyncHandler(async(req,res)=>ApiResponse.ok(res,toJSON(await Payment.findById(req.params.id)),'Payment fetched'));
export const unlock=asyncHandler(async(req,res)=>{const p=await Payment.findByIdAndUpdate(req.params.id,{contactUnlocked:true},{new:true});ApiResponse.ok(res,toJSON(p),'Contact unlocked');});
