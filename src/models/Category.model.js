import mongoose from 'mongoose';
const {Schema}=mongoose;
const subcategorySchema = new Schema(
  { subId: { type: String, required: true }, name: { type: String, required: true }, slug: String },
  { _id: false },
);

const categorySchema = new Schema(
  {
    slug: { type: String, unique: true },
    name: String,
    icon: String,
    sortOrder: Number,
    isActive: { type: Boolean, default: true },
    subcategories: [subcategorySchema],
  },
  { timestamps: true },
);
export default mongoose.model('Category',categorySchema);
