import mongoose from 'mongoose';
const {Schema}=mongoose;
const paymentSchema=new Schema({userId:{type:Schema.Types.ObjectId,ref:'User'},type:{type:String,enum:['course','subscription','tutor_session','listing','combo']},referenceId:Schema.Types.ObjectId,amount:Number,currency:{type:String,default:'USD'},method:{type:String,enum:['stripe','razorpay','paypal','manual']},status:{type:String,enum:['pending','paid','failed','refunded'],default:'pending'},invoiceId:String,metadata:Schema.Types.Mixed,contactUnlocked:Boolean},{timestamps:true});
export default mongoose.model('Payment',paymentSchema);
