import mongoose from 'mongoose';
const {Schema}=mongoose;
const bannerSchema=new Schema({title:String,description:String,ctaText:String,ctaLink:String,imageUrl:String,targetType:{type:String,enum:['global','country','city']},targetValue:String,active:Boolean,priority:Number,startAt:Date,endAt:Date},{timestamps:true});
export default mongoose.model('Banner',bannerSchema);
