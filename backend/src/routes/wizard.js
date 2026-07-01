/**
 * Полуавтоматический флоу добавления WhatsApp аккаунта:
 * 1. Система покупает номер на 5sim
 * 2. Пользователь вводит номер в WhatsApp на телефоне
 * 3. Система ловит SMS код автоматически
 * 4. Пользователь вводит код в WhatsApp
 * 5. Система подключает аккаунт через pairing code
 */

import { Router } from 'express';
import { WaAccounts } from '../store/index.js';
import { buyNumber, checkSms, confirmOrder, cancelOrder } from '../services/fiveSimService.js';
import { startClientWithPairing } from '../services/waPoolService.js';

const router = Router();

// Активные сессии визарда: orderId → { phone, accountId, status, smsCode, pairingCode }
const wizardSessions = new Map();

// POST /api/wizard/start — купить номер на 5sim
router.post('/start', async (req, res) => {
  const { country = 'any' } = req.body;

  const result = await buyNumber(country);
  if (!result.ok) {
    return res.status(400).json({ error: `5sim: ${result.error}` });
  }

  const { id: orderId, phone } = result.data;
  const cleanPhone = phone.replace(/\D/g, '');

  // Создаём аккаунт в статусе pending
  const account = WaAccounts.create({
    phone: cleanPhone,
    label: cleanPhone,
    fiveSimOrderId: orderId,
    status: 'connecting',
  });

  wizardSessions.set(String(orderId), {
    orderId,
    phone: cleanPhone,
    accountId: account._id,
    status: 'waiting_registration', // waiting_registration → waiting_sms → waiting_pairing → done
    smsCode: null,
    pairingCode: null,
  });

  console.log(`[Wizard] Started: ${cleanPhone}, orderId: ${orderId}`);

  res.json({ orderId, phone: cleanPhone, accountId: account._id });
});

// GET /api/wizard/:orderId/status — текущий статус + SMS код если пришёл
router.get('/:orderId/status', async (req, res) => {
  const session = wizardSessions.get(req.params.orderId);
  if (!session) return res.status(404).json({ error: 'Сессия не найдена' });

  // Если ждём SMS — проверяем
  if (session.status === 'waiting_sms' && !session.smsCode) {
    const smsResult = await checkSms(session.orderId);
    if (smsResult.ok && smsResult.code) {
      session.smsCode = smsResult.code;
      session.status = 'waiting_pairing';
      await confirmOrder(session.orderId).catch(() => {});
      console.log(`[Wizard] SMS received for ${session.phone}: ${smsResult.code}`);
    }
  }

  res.json({
    status: session.status,
    phone: session.phone,
    smsCode: session.smsCode,
    pairingCode: session.pairingCode,
  });
});

// POST /api/wizard/:orderId/sms-sent — пользователь ввёл номер в WhatsApp, начинаем ждать SMS
router.post('/:orderId/sms-sent', (req, res) => {
  const session = wizardSessions.get(req.params.orderId);
  if (!session) return res.status(404).json({ error: 'Сессия не найдена' });

  session.status = 'waiting_sms';
  console.log(`[Wizard] Waiting for SMS on ${session.phone}...`);
  res.json({ ok: true });
});

// POST /api/wizard/:orderId/connect — пользователь ввёл SMS код, подключаем через pairing code
router.post('/:orderId/connect', async (req, res) => {
  const session = wizardSessions.get(req.params.orderId);
  if (!session) return res.status(404).json({ error: 'Сессия не найдена' });

  const account = WaAccounts.getById(session.accountId);
  if (!account) return res.status(404).json({ error: 'Аккаунт не найден' });

  res.json({ ok: true, message: 'Получаем pairing code...' });

  // Запускаем Baileys и получаем pairing code
  try {
    const pairingCode = await startClientWithPairing(account);
    session.pairingCode = pairingCode;
    session.status = pairingCode ? 'waiting_pairing_confirm' : 'error';
    console.log(`[Wizard] Pairing code for ${session.phone}: ${pairingCode}`);
  } catch (err) {
    session.status = 'error';
    WaAccounts.update(session.accountId, { status: 'disconnected', error: err.message });
  }
});

// POST /api/wizard/:orderId/cancel — отмена
router.post('/:orderId/cancel', async (req, res) => {
  const session = wizardSessions.get(req.params.orderId);
  if (!session) return res.status(404).json({ error: 'Сессия не найдена' });

  await cancelOrder(session.orderId).catch(() => {});
  WaAccounts.delete(session.accountId);
  wizardSessions.delete(req.params.orderId);
  res.json({ ok: true });
});

export default router;
