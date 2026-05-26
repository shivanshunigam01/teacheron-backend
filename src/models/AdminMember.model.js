import mongoose from 'mongoose';
const {Schema}=mongoose;
const adminMemberSchema=new Schema({userId:{type:Schema.Types.ObjectId,ref:'User',required:true,unique:true},staffRole:{type:String,enum:['super_admin','manager','moderator'],required:true},permissions:[String],invitedBy:{type:Schema.Types.ObjectId,ref:'User'},isActive:{type:Boolean,default:true}},{timestamps:true});
export default mongoose.model('AdminMember',adminMemberSchema);
