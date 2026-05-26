import mongoose from 'mongoose';
const {Schema}=mongoose;
const messageSchema=new Schema({conversationId:{type:Schema.Types.ObjectId,ref:'Conversation'},senderId:{type:Schema.Types.ObjectId,ref:'User'},text:String},{timestamps:true});
export default mongoose.model('Message',messageSchema);
