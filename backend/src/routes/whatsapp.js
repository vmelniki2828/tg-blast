import { Router } from 'express';
import {
  getWaStatus,
  getQrDataUrl,
  sendWhatsApp,
  logoutWhatsApp,
  reconnectWhatsApp,
  initWhatsApp,
} from '../services/whatsappService.js';

const router = Router();

// GET /api/whatsapp/status
router.get('/status', (req, res) => {
  res.json(getWaStatus());
});

// GET /api/whatsapp/qr
router.get('/qr', (req, res) => {
  const qr = getQrDataUrl();
  if (!qr) return res.status(404).json({ error: 'QR недоступен' });
  res.json({ qr });
});

// POST /api/whatsapp/connect — подключить по номеру телефона (pairing code)
router.post('/connect', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'phone обязателен' });
  await reconnectWhatsApp(phone);
  res.json({ ok: true, message: 'Инициализация запущена, ожидайте код...' });
});

// POST /api/whatsapp/connect-qr — подключить по QR (старый способ)
router.post('/connect-qr', async (req, res) => {
  await reconnectWhatsApp(null);
  res.json({ ok: true, message: 'QR скоро появится' });
});

// POST /api/whatsapp/test
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

// POST /api/whatsapp/reconnect (legacy)
router.post('/reconnect', async (req, res) => {
  await reconnectWhatsApp(null);
  res.json({ ok: true });
});

export default router;
