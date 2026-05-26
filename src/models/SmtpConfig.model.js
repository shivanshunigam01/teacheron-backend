import mongoose from 'mongoose';
const {Schema}=mongoose;
const smtpConfigSchema=new Schema({host:String,port:Number,secure:Boolean,user:String,pass:{type:String,select:false},fromName:String,fromEmail:String,isActive:Boolean},{timestamps:true});
export default mongoose.model('SmtpConfig',smtpConfigSchema);
