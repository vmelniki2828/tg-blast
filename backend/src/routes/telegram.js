import { Router } from 'express';
import { getBotInfo } from '../services/telegramService.js';
import { sendMessage } from '../services/telegramService.js';

const router = Router();

// GET /api/telegram/status — проверить токен
router.get('/status', async (req, res) => {
  const info = await getBotInfo();
  if (info) {
    res.json({ ok: true, bot: info });
  } else {
    res.status(400).json({ ok: false, error: 'Неверный токен или нет соединения' });
  }
});

// POST /api/telegram/test — тестовая отправка
router.post('/test', async (req, res) => {
  const { chatId, text } = req.body;
  if (!chatId || !text) return res.status(400).json({ error: 'chatId и text обязательны' });
  const result = await sendMessage(chatId, text);
  res.json(result);
});

export default router;
