import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode';

let client = null;
let qrDataUrl = null;
let pairingCode = null;
let pairingPhone = null; // номер для которого запрашиваем код
let waStatus = 'disconnected';

export const getWaStatus = () => ({
  status: waStatus,
  hasQr: !!qrDataUrl,
  pairingCode: pairingCode || null,
});
export const getQrDataUrl = () => qrDataUrl;

export const initWhatsApp = (phone = null) => {
  if (client) return;
  console.log('Initializing WhatsApp client...');
  waStatus = 'initializing';
  pairingPhone = phone ? phone.replace(/\D/g, '') : null;
  pairingCode = null;
  qrDataUrl = null;

  client = new Client({
    authStrategy: new LocalAuth({ dataPath: '.wwebjs_auth' }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--no-zygote'],
    },
  });

  client.on('qr', async (qr) => {
    if (pairingPhone) {
      waStatus = 'qr_ready';
      console.log(`Requesting pairing code for ${pairingPhone}...`);
      // Небольшая задержка — WhatsApp должен успеть инициализироваться
      await new Promise(r => setTimeout(r, 2000));
      try {
        const code = await client.requestPairingCode(pairingPhone);
        pairingCode = code;
        console.log(`✓ Pairing code: ${code}`);
      } catch (err) {
        console.error('✗ Pairing code failed:', err.message, err.stack);
        // Показываем QR как запасной вариант
        qrDataUrl = await qrcode.toDataURL(qr).catch(() => null);
      }
    } else {
      console.log('WhatsApp QR ready — scan with your phone');
      waStatus = 'qr_ready';
      qrDataUrl = await qrcode.toDataURL(qr).catch(() => null);
    }
  });

  client.on('authenticated', () => {
    qrDataUrl = null;
    pairingCode = null;
  });

  client.on('ready', () => {
    console.log('WhatsApp ready');
    waStatus = 'ready';
    qrDataUrl = null;
    pairingCode = null;
  });

  client.on('auth_failure', () => {
    waStatus = 'disconnected';
    client = null;
    pairingCode = null;
  });

  client.on('disconnected', () => {
    waStatus = 'disconnected';
    qrDataUrl = null;
    pairingCode = null;
    client = null;
  });

  client.initialize().catch((err) => {
    console.error('WhatsApp init error:', err.message);
    waStatus = 'disconnected';
    client = null;
  });
};

export const sendWhatsApp = async (phone, text) => {
  if (waStatus !== 'ready' || !client) {
    return { ok: false, error: 'WhatsApp не подключён (статус: ' + waStatus + ')' };
  }
  try {
    const digits = phone.replace(/\D/g, '');
    const numberId = await client.getNumberId(digits);
    if (!numberId) {
      return { ok: false, error: `Номер ${digits} не зарегистрирован в WhatsApp` };
    }
    await client.sendMessage(numberId._serialized, text);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
};

export const logoutWhatsApp = async () => {
  if (client) await client.logout().catch(() => {});
  client = null;
  waStatus = 'disconnected';
  qrDataUrl = null;
  pairingCode = null;
  pairingPhone = null;
};

export const reconnectWhatsApp = async (phone = null) => {
  if (client) await client.destroy().catch(() => {});
  client = null;
  qrDataUrl = null;
  pairingCode = null;
  waStatus = 'disconnected';
  initWhatsApp(phone);
};
