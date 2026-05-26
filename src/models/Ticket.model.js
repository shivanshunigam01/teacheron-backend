import mongoose from 'mongoose';
const {Schema}=mongoose;
const ticketSchema=new Schema({userId:{type:Schema.Types.ObjectId,ref:'User'},ticketNumber:{type:String,unique:true},subject:String,priority:{type:String,enum:['Low','Medium','High']},status:{type:String,enum:['Open','In Progress','Resolved','Closed'],default:'Open'},messages:[{authorId:Schema.Types.ObjectId,authorRole:String,body:String,createdAt:{type:Date,default:Date.now}}]},{timestamps:true});
export default mongoose.model('Ticket',ticketSchema);
