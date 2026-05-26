import mongoose from 'mongoose';
const {Schema}=mongoose;
const categorySchema=new Schema({slug:{type:String,unique:true},name:String,icon:String,sortOrder:Number,isActive:{type:Boolean,default:true}},{timestamps:true});
export default mongoose.model('Category',categorySchema);
