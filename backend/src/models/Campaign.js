import mongoose from 'mongoose';

const campaignSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  text: { type: String, required: true },
  // 'all' — всем активным контактам, или массив Contact._id
  recipients: {
    type: mongoose.Schema.Types.Mixed, // 'all' | [ObjectId]
    default: 'all',
  },
  // telegram | whatsapp | both
  channel: { type: String, enum: ['telegram', 'whatsapp', 'both'], default: 'telegram' },
  // null = отправить сразу, Date = отложенная
  scheduledAt: { type: Date, default: null },
  // pending | sending | done | failed | cancelled
  status: { type: String, enum: ['pending', 'sending', 'done', 'failed', 'cancelled'], default: 'pending' },
  sentAt: { type: Date, default: null },
  stats: {
    total: { type: Number, default: 0 },
    sent: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
  },
}, { timestamps: true });

export default mongoose.model('Campaign', campaignSchema);
