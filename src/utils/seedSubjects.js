import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import Subject from '../models/Subject.model.js';
import { SUBJECT_CATALOG, SUBJECT_CATALOG_COUNT } from '../data/subjects.catalog.js';

const reset = process.argv.includes('--reset');

await connectDB();

if (reset) {
  await Subject.deleteMany({});
  console.log('Cleared existing subjects.');
}

const ops = SUBJECT_CATALOG.map((row) => ({
  updateOne: {
    filter: { slug: row.slug },
    update: { $set: row },
    upsert: true,
  },
}));

const result = await Subject.bulkWrite(ops, { ordered: false });
const total = await Subject.countDocuments();

console.log(`Subject catalog seed complete.`);
console.log(`  Catalog entries: ${SUBJECT_CATALOG_COUNT}`);
console.log(`  Upserted: ${result.upsertedCount} new, ${result.modifiedCount} updated`);
console.log(`  Total in DB: ${total}`);

await mongoose.disconnect();
