import mongoose from 'mongoose';
const {Schema}=mongoose;
const reviewSchema=new Schema({targetType:{type:String,enum:['course','tutor','platform']},courseId:Schema.Types.ObjectId,tutorId:{type:Schema.Types.ObjectId,ref:'User'},authorId:{type:Schema.Types.ObjectId,ref:'User'},authorName:String,rating:{type:Number,min:1,max:5},text:String,status:{type:String,enum:['pending','published','hidden'],default:'pending'}},{timestamps:true});
export default mongoose.model('Review',reviewSchema);
