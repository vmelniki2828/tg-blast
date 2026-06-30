import { Router } from 'express';
import {
  getWaStatus,
  getQrDataUrl,
  sendWhatsApp,
  logoutWhatsApp,
  reconnectWhatsApp,
} from '../services/whatsappService.js';

const router = Router();

// GET /api/whatsapp/status
router.get('/status', (req, res) => {
  res.json(getWaStatus());
});

// GET /api/whatsapp/qr — вернуть QR как data URL (или 404 если нет)
router.get('/qr', (req, res) => {
  const qr = getQrDataUrl();
  if (!qr) return res.status(404).json({ error: 'QR недоступен' });
  res.json({ qr });
});

// POST /api/whatsapp/test — тестовая отправка
router.post('/test', async (req, res) => {
  const { phone, text } = req.body;
  if (!phone || !text) return res.status(400).json({ error: 'phone и text обязательны' });
  const result = await sendWhatsApp(phone, text);
  res.json(result);
});

// POST /api/whatsapp/logout
router.post('/logout', async (req, res) => {
  await logoutWhatsApp();
  res.json({ ok: true });
});

// POST /api/whatsapp/reconnect
router.post('/reconnect', async (req, res) => {
  await reconnectWhatsApp();
  res.json({ ok: true, message: 'Переподключение запущено' });
});

export default router;
