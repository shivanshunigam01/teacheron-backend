import mongoose from 'mongoose';
const {Schema}=mongoose;
const proposalSchema=new Schema({requirementId:{type:Schema.Types.ObjectId,ref:'Requirement'},teacherId:{type:Schema.Types.ObjectId,ref:'User'},message:String,proposedRate:Number,status:{type:String,enum:['pending','accepted','declined'],default:'pending'}},{timestamps:true});
export default mongoose.model('Proposal',proposalSchema);
