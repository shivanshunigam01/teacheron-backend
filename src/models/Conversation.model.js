import mongoose from 'mongoose';
const {Schema}=mongoose;
const conversationSchema=new Schema({participants:[{type:Schema.Types.ObjectId,ref:'User'}],lastMessage:String},{timestamps:true});
export default mongoose.model('Conversation',conversationSchema);
