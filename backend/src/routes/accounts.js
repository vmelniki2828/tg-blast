import { Router } from 'express';
import { WaAccounts } from '../store/index.js';
import { startClientWithPairing, startClientWithQr, stopClient, register5SimAccount } from '../services/waPoolService.js';
import { buyNumber, getBalance } from '../services/fiveSimService.js';

const router = Router();

// GET /api/accounts
router.get('/', (req, res) => {
  res.json(WaAccounts.getAll());
});

// GET /api/accounts/health
router.get('/health', (req, res) => {
  res.json({ ok: true, mode: 'baileys-local' });
});

// GET /api/accounts/balance
router.get('/balance', async (req, res) => {
  const result = await getBalance();
  res.json(result);
});

// POST /api/accounts/add-manual — свой номер с pairing code
router.post('/add-manual', async (req, res) => {
  const { phone, label } = req.body;
  if (!phone) return res.status(400).json({ error: 'phone обязателен' });

  const cleanPhone = phone.replace(/\D/g, '');
  const account = WaAccounts.create({ phone: cleanPhone, label: label || cleanPhone });

  // Запускаем и ждём pairing code (до 15 сек)
  const pairingCode = await startClientWithPairing(account);

  res.json({ account: WaAccounts.getById(account._id), pairingCode });
});

// POST /api/accounts/add-qr — подключить новый аккаунт по QR-коду
router.post('/add-qr', async (req, res) => {
  const { label } = req.body;
  const account = WaAccounts.create({ label: label || 'Новый аккаунт' });

  res.json({ account });

  startClientWithQr(account).catch(err => {
    WaAccounts.update(account._id, { status: 'disconnected', error: err.message });
  });
});

// GET /api/accounts/:id/qr — получить QR-картинку для аккаунта
router.get('/:id/qr', (req, res) => {
  const account = WaAccounts.getById(req.params.id);
  if (!account) return res.status(404).json({ error: 'Не найден' });
  if (!account.qr) return res.status(404).json({ error: 'QR недоступен' });
  res.json({ qr: account.qr });
});

// POST /api/accounts/add-5sim — пользователь сам купил номер на 5sim
router.post('/add-5sim', async (req, res) => {
  const { phone, orderId, label } = req.body;
  if (!phone || !orderId) return res.status(400).json({ error: 'phone и orderId обязательны' });

  const cleanPhone = phone.replace(/\D/g, '');
  const account = WaAccounts.create({
    phone: cleanPhone,
    label: label || cleanPhone,
    fiveSimOrderId: orderId,
    status: 'connecting',
  });

  res.json({ account, message: 'Регистрация запущена' });

  register5SimAccount(account._id, orderId).catch(err => {
    console.error('5sim register error:', err.message);
    WaAccounts.update(account._id, { status: 'disconnected', error: err.message });
  });
});

// POST /api/accounts/add-auto — купить номер на 5sim автоматически
router.post('/add-auto', async (req, res) => {
  const { country = 'any', label } = req.body;

  const numberResult = await buyNumber(country);
  if (!numberResult.ok) return res.status(400).json({ error: `5sim: ${numberResult.error}` });

  const { id: orderId, phone } = numberResult.data;
  const cleanPhone = phone.replace(/\D/g, '');

  const account = WaAccounts.create({
    phone: cleanPhone,
    label: label || cleanPhone,
    fiveSimOrderId: orderId,
    status: 'connecting',
  });

  res.json({ account, message: 'Регистрация запущена' });

  register5SimAccount(account._id, orderId).catch(err => {
    console.error('Auto-register error:', err.message);
    WaAccounts.update(account._id, { status: 'disconnected', error: err.message });
  });
});

// DELETE /api/accounts/:id
router.delete('/:id', async (req, res) => {
  const account = WaAccounts.getById(req.params.id);
  if (!account) return res.status(404).json({ error: 'Не найден' });
  await stopClient(req.params.id);
  WaAccounts.delete(req.params.id);
  res.json({ ok: true });
});

// POST /api/accounts/:id/logout
router.post('/:id/logout', async (req, res) => {
  const account = WaAccounts.getById(req.params.id);
  if (!account) return res.status(404).json({ error: 'Не найден' });
  await stopClient(req.params.id);
  WaAccounts.update(req.params.id, { status: 'disconnected', pairingCode: null });
  res.json({ ok: true });
});

export default router;
