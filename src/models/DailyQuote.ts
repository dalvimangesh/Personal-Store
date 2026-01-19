import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDailyQuote extends Document {
  text: string;
  author: string;
  date: string; // YYYY-MM-DD
}

const DailyQuoteSchema: Schema = new Schema({
  text: { type: String, required: true },
  author: { type: String, required: true },
  date: { type: String, required: true, unique: true },
}, { timestamps: true });

const DailyQuote: Model<IDailyQuote> = mongoose.models.DailyQuote || mongoose.model<IDailyQuote>('DailyQuote', DailyQuoteSchema);

export default DailyQuote;
