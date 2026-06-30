import mongoose from 'mongoose';

const contactSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  // Telegram chat ID (обязателен если нет phone)
  chatId: { type: String, trim: true, default: '' },
  username: { type: String, trim: true, default: '' },
  // WhatsApp номер: 79001234567 (без + и пробелов)
  phone: { type: String, trim: true, default: '' },
  tags: { type: [String], default: [] },
  notes: { type: String, default: '' },
  active: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('Contact', contactSchema);
