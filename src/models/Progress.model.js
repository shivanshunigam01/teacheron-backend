import mongoose from 'mongoose';
const {Schema}=mongoose;
const progressSchema=new Schema({enrollmentId:{type:Schema.Types.ObjectId,ref:'Enrollment'},userId:{type:Schema.Types.ObjectId,ref:'User'},courseId:{type:Schema.Types.ObjectId,ref:'Course'},lessonId:String,moduleId:String,completed:Boolean,watchedSeconds:Number},{timestamps:true});
export default mongoose.model('Progress',progressSchema);
