import mongoose from 'mongoose';

const sendLogSchema = new mongoose.Schema({
  campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true },
  contact: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', required: true },
  chatId: { type: String, default: '' },
  // telegram | whatsapp
  channel: { type: String, enum: ['telegram', 'whatsapp'], required: true },
  // sent | failed
  status: { type: String, enum: ['sent', 'failed'], required: true },
  error: { type: String, default: null },
  sentAt: { type: Date, default: Date.now },
}, { timestamps: false });

export default mongoose.model('SendLog', sendLogSchema);
