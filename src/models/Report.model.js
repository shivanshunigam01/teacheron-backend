import mongoose from 'mongoose';
const {Schema}=mongoose;
const reportSchema=new Schema({reporterId:{type:Schema.Types.ObjectId,ref:'User'},targetType:{type:String,enum:['listing','course','user','review']},targetId:Schema.Types.ObjectId,reason:String,status:{type:String,enum:['open','reviewing','resolved','dismissed'],default:'open'},resolvedBy:{type:Schema.Types.ObjectId,ref:'User'},notes:String},{timestamps:true});
export default mongoose.model('Report',reportSchema);
