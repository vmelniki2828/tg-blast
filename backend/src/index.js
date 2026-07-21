import 'dotenv/config';

// whatsapp-web.js иногда кидает необработанные ошибки из внутренних puppeteer
// колбэков (переинжект скриптов после навигации страницы). Без этой страховки
// такая ошибка валит весь процесс и вместе с ним Telegram/контакты/рассылки.
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err?.message || err);
});
process.on('unhandledRejection', (err) => {
  console.error('[unhandledRejection]', err?.message || err);
});

import express from 'express';
import cors from 'cors';
import { startScheduler } from './services/schedulerService.js';
import { reconnectAllAccounts } from './services/waPoolService.js';
import { startWarmupScheduler } from './services/warmupService.js';
import contactsRouter from './routes/contacts.js';
import campaignsRouter from './routes/campaigns.js';
import logsRouter from './routes/logs.js';
import telegramRouter from './routes/telegram.js';
import whatsappRouter from './routes/whatsapp.js';
import accountsRouter from './routes/accounts.js';
import wizardRouter from './routes/wizard.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/contacts', contactsRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/logs', logsRouter);
app.use('/api/telegram', telegramRouter);
app.use('/api/whatsapp', whatsappRouter);
app.use('/api/accounts', accountsRouter);
app.use('/api/wizard', wizardRouter);

app.get('/api/health', (_, res) => res.json({ status: 'ok', storage: 'in-memory' }));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT} (in-memory storage)`);
  startScheduler();
  reconnectAllAccounts();
  startWarmupScheduler();
});
