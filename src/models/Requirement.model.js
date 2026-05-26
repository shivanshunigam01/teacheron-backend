import mongoose from 'mongoose';
const {Schema}=mongoose;
const requirementSchema=new Schema({studentId:{type:Schema.Types.ObjectId,ref:'User'},title:{type:String,required:true},subject:String,level:{type:String,enum:['elem','middle','high','college','pro']},mode:{type:String,enum:['online','offline','both']},sessionsPerWeek:Number,location:String,budgetPerHour:Number,duration:{type:String,enum:['once','month','semester','ongoing']},details:{type:String,required:true},status:{type:String,enum:['open','matched','closed','cancelled'],default:'open'},approved:{type:Boolean,default:false}},{timestamps:true});
export default mongoose.model('Requirement',requirementSchema);
