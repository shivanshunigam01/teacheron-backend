import mongoose from 'mongoose';
const {Schema}=mongoose;
const accommodationSchema=new Schema({name:String,type:{type:String,enum:['PG','Hostel','Apartment','Shared Room','Other']},typeOther:{type:String,trim:true},city:String,country:String,address:String,pricePerMonth:Number,currency:String,amenities:[String],gender:{type:String,enum:['boys','girls','co-ed','other']},genderOther:{type:String,trim:true},rating:Number,imageUrl:String,images:[String],available:Boolean,description:String,contactPhone:String,contactEmail:String,distanceToCampus:String,createdBy:{type:Schema.Types.ObjectId,ref:'User'},status:{type:String,enum:['active','inactive'],default:'active'}},{timestamps:true});
export default mongoose.model('Accommodation',accommodationSchema);
