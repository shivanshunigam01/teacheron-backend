import mongoose from 'mongoose';
const {Schema}=mongoose;
const notificationSchema=new Schema({userId:{type:Schema.Types.ObjectId,ref:'User'},title:String,body:String,type:{type:String,enum:['course','booking','certificate','system','promo']},read:{type:Boolean,default:false},link:String,metadata:Schema.Types.Mixed},{timestamps:true});
export default mongoose.model('Notification',notificationSchema);
