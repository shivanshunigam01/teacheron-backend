import mongoose from 'mongoose';
const {Schema}=mongoose;
const enrollmentSchema=new Schema({userId:{type:Schema.Types.ObjectId,ref:'User'},courseId:{type:Schema.Types.ObjectId,ref:'Course'},status:{type:String,enum:['active','completed','cancelled'],default:'active'},enrolledAt:{type:Date,default:Date.now},completedAt:Date,progressPercent:{type:Number,default:0}},{timestamps:true});
enrollmentSchema.index({userId:1,courseId:1},{unique:true});
export default mongoose.model('Enrollment',enrollmentSchema);
