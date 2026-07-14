/**
 * Пул WhatsApp аккаунтов через Baileys (без Docker, без Chrome).
 * Поддерживает регистрацию новых номеров через SMS (для 5sim).
 */

import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
} from '@whiskeysockets/baileys';
import qrcode from 'qrcode';
import { WaAccounts } from '../store/index.js';
import { waitForSms, confirmOrder, cancelOrder } from './fiveSimService.js';
import path from 'path';

const delay = (ms) => new Promise(r => setTimeout(r, ms));
const SESSIONS_DIR = '.wa_sessions';

// Map: accountId → { sock, registered }
const sockets = new Map();

/**
 * Запустить сокет для аккаунта.
 * Если registered=false — только создаём сокет, потом registerWithSms.
 */
export const startSocket = async (account) => {
  const { _id } = account;
  if (sockets.has(_id)) return sockets.get(_id).sock;

  const { version } = await fetchLatestBaileysVersion();
  // Сессия привязана к _id аккаунта, а не к номеру — номер не всегда
  // известен заранее (QR-подключение) и не гарантированно уникален.
  const sessionPath = path.join(SESSIONS_DIR, _id);
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

    const noop = () => {};
  const silentLogger = {
    level: 'silent',
    info: noop, warn: noop, error: noop, debug: noop, trace: noop, fatal: noop,
    child: () => silentLogger,
  };

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: silentLogger,
  });

  sockets.set(_id, { sock, registered: state.creds.registered });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    const label = account.phone || account.label || _id;

    if (qr) {
      const dataUrl = await qrcode.toDataURL(qr).catch(() => null);
      console.log(`[${label}] QR ready`);
      WaAccounts.update(_id, { qr: dataUrl, status: 'connecting' });
    }

    if (connection === 'open') {
      // При QR-подключении номер заранее неизвестен — берём его из сессии.
      const waNumber = sock.user?.id?.split(':')[0]?.split('@')[0] || account.phone;
      console.log(`[${waNumber}] Connected ✓`);
      WaAccounts.update(_id, {
        status: 'ready',
        pairingCode: null,
        qr: null,
        error: null,
        phone: waNumber,
        label: account.phone ? account.label : (account.label || waNumber),
      });
    } else if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      const loggedOut = code === DisconnectReason.loggedOut;
      console.log(`[${label}] Disconnected (code ${code}, loggedOut: ${loggedOut})`);
      WaAccounts.update(_id, { status: 'disconnected', qr: null });
      sockets.delete(_id);

      if (!loggedOut) {
        // Переподключаемся через 5 секунд
        await delay(5000);
        const acc = WaAccounts.getById(_id);
        if (acc) startSocket(acc).catch(() => {});
      }
    }
  });

  return sock;
};

/**
 * Остановить сокет аккаунта.
 */
export const stopClient = async (accountId) => {
  const entry = sockets.get(accountId);
  if (!entry) return;
  await entry.sock.logout().catch(() => {});
  sockets.delete(accountId);
};

/**
 * Зарегистрировать новый номер через SMS (для 5sim).
 * Шаги: startSocket → requestRegistrationCode → waitForSms → register(code)
 */
export const register5SimAccount = async (accountId, orderId) => {
  const account = WaAccounts.getById(accountId);
  if (!account) return;

  try {
    const sock = await startSocket(account);
    const entry = sockets.get(accountId);

    // Если уже зарегистрирован — ждём просто connected
    if (entry.registered) {
      console.log(`[${account.phone}] Already registered, waiting for connection...`);
      WaAccounts.update(accountId, { status: 'connecting' });
      return;
    }

    WaAccounts.update(accountId, { status: 'connecting' });

    // Найдём метод регистрации (название зависит от версии Baileys)
    const phone = account.phone.startsWith('+') ? account.phone : `+${account.phone}`;
    const regFn = sock.requestRegistrationCode
      || sock.requestVerificationCode
      || sock.register?.requestCode;

    if (!regFn) {
      // Baileys не поддерживает регистрацию новых номеров в этой версии.
      // Используем pairing code — подходит только если номер уже имеет WhatsApp.
      console.log(`[${account.phone}] Registration API not available, trying pairing code...`);
      const code = await sock.requestPairingCode(account.phone.replace(/\D/g, '')).catch(() => null);
      if (code) {
        WaAccounts.update(accountId, { pairingCode: code });
        console.log(`[${account.phone}] Pairing code: ${code} — enter in WhatsApp app`);
      } else {
        WaAccounts.update(accountId, {
          status: 'disconnected',
          error: 'Baileys не поддерживает регистрацию новых номеров. Номер должен уже иметь WhatsApp.',
        });
      }
      return;
    }

    // Запрашиваем SMS-код от WhatsApp
    console.log(`[${account.phone}] Requesting SMS registration code...`);
    await regFn.call(sock, { phoneNumber: phone, method: 'sms' });
    console.log(`[${account.phone}] SMS requested, waiting on 5sim...`);

    // Ждём SMS на 5sim
    const smsResult = await waitForSms(orderId, 180_000);
    if (!smsResult.ok) {
      await cancelOrder(orderId).catch(() => {});
      WaAccounts.update(accountId, { status: 'disconnected', error: `SMS не пришла: ${smsResult.error}` });
      return;
    }

    console.log(`[${account.phone}] Got SMS code: ${smsResult.code}`);
    await confirmOrder(orderId).catch(() => {});

    // Подтверждаем регистрацию
    const verifyFn = sock.register || sock.verifyCode;
    await verifyFn.call(sock, smsResult.code.replace(/\D/g, ''));
    console.log(`[${account.phone}] Registered! Waiting for connection...`);

  } catch (err) {
    console.error(`[${account.phone}] register5SimAccount error:`, err.message);
    WaAccounts.update(accountId, { status: 'disconnected', error: err.message });
  }
};

/**
 * Подключить свой номер через pairing code (для существующих аккаунтов).
 */
export const startClientWithPairing = async (account) => {
  const sock = await startSocket(account);

  WaAccounts.update(account._id, { status: 'connecting', pairingCode: null });

  // Запрашиваем pairing code через 3 сек после инициализации
  await delay(3000);
  try {
    const code = await sock.requestPairingCode(account.phone.replace(/\D/g, ''));
    console.log(`[${account.phone}] Pairing code: ${code}`);
    WaAccounts.update(account._id, { pairingCode: code });
    return code;
  } catch (err) {
    console.error(`[${account.phone}] Pairing code error:`, err.message);
    WaAccounts.update(account._id, { error: 'Не удалось получить pairing code' });
    return null;
  }
};

/**
 * Подключить новый аккаунт по QR-коду.
 * Номер телефона заранее неизвестен — станет известен после сканирования.
 */
export const startClientWithQr = async (account) => {
  WaAccounts.update(account._id, { status: 'connecting', qr: null, pairingCode: null });
  await startSocket(account);
};

/**
 * Восстановить все сохранённые аккаунты после рестарта backend.
 * Переиспользует сессии Baileys на диске — новый QR/код не нужен,
 * если WhatsApp не разлогинил устройство за это время.
 */
export const reconnectAllAccounts = async () => {
  for (const account of WaAccounts.getAll()) {
    startSocket(account).catch(err => {
      WaAccounts.update(account._id, { status: 'disconnected', error: err.message });
    });
  }
};

/**
 * Отправить сообщение через конкретный аккаунт.
 */
export const sendViaClient = async (accountId, phone, text) => {
  const entry = sockets.get(accountId);
  if (!entry) return { ok: false, error: 'Клиент не запущен' };

  const account = WaAccounts.getById(accountId);
  if (!account || account.status !== 'ready') {
    return { ok: false, error: 'Аккаунт не готов' };
  }

  try {
    const digits = phone.replace(/\D/g, '');
    const jid = `${digits}@s.whatsapp.net`;
    await entry.sock.sendMessage(jid, { text });
    WaAccounts.update(accountId, {
      sentToday: (account.sentToday || 0) + 1,
      sentTotal: (account.sentTotal || 0) + 1,
      lastUsed: new Date(),
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
};

/**
 * Отправить через наименее загруженный готовый аккаунт из пула.
 */
export const sendViaPool = async (phone, text) => {
  const account = WaAccounts.getLeastLoaded();
  if (!account) return { ok: false, error: 'Нет готовых WA аккаунтов в пуле' };
  return sendViaClient(account._id, phone, text);
};
