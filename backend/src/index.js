import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { startScheduler } from './services/schedulerService.js';
import { initWhatsApp } from './services/whatsappService.js';
import contactsRouter from './routes/contacts.js';
import campaignsRouter from './routes/campaigns.js';
import logsRouter from './routes/logs.js';
import telegramRouter from './routes/telegram.js';
import whatsappRouter from './routes/whatsapp.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/contacts', contactsRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/logs', logsRouter);
app.use('/api/telegram', telegramRouter);
app.use('/api/whatsapp', whatsappRouter);

app.get('/api/health', (_, res) => res.json({ status: 'ok', storage: 'in-memory' }));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT} (in-memory storage)`);
  startScheduler();
  initWhatsApp();
});
