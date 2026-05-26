import mongoose from 'mongoose';
const {Schema}=mongoose;
const listingSchema=new Schema({sellerId:{type:Schema.Types.ObjectId,ref:'User'},category:{type:String,enum:['materials','services','accommodation']},title:String,description:String,price:Number,currency:{type:String,default:'USD'},imageUrl:String,images:[String],city:String,country:String,status:{type:String,enum:['draft','pending','approved','rejected','sold'],default:'pending'},approvedBy:{type:Schema.Types.ObjectId,ref:'User'},viewCount:{type:Number,default:0}},{timestamps:true});
export default mongoose.model('Listing',listingSchema);
