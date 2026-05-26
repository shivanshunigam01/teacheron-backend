import mongoose from 'mongoose';
const {Schema}=mongoose;
const accommodationInquirySchema=new Schema({accommodationId:{type:Schema.Types.ObjectId,ref:'Accommodation'},accommodationName:String,studentName:String,email:String,phone:String,city:String,country:String,message:String,status:{type:String,enum:['new','contacted','closed'],default:'new'},userId:{type:Schema.Types.ObjectId,ref:'User'}},{timestamps:true});
export default mongoose.model('AccommodationInquiry',accommodationInquirySchema);
