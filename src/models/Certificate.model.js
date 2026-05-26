import mongoose from 'mongoose';
const {Schema}=mongoose;
const certificateSchema=new Schema({userId:{type:Schema.Types.ObjectId,ref:'User'},courseId:{type:Schema.Types.ObjectId,ref:'Course'},enrollmentId:{type:Schema.Types.ObjectId,ref:'Enrollment'},certificateNumber:{type:String,unique:true},issuedAt:{type:Date,default:Date.now},pdfPath:String},{timestamps:true});
export default mongoose.model('Certificate',certificateSchema);
