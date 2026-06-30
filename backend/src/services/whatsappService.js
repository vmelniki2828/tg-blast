import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode';

let client = null;
let qrDataUrl = null;
let waStatus = 'disconnected';

export const formatPhone = (phone) => phone.replace(/\D/g, '') + '@c.us';
export const getWaStatus = () => ({ status: waStatus, hasQr: !!qrDataUrl });
export const getQrDataUrl = () => qrDataUrl;

export const initWhatsApp = () => {
  if (client) return;
  console.log('Initializing WhatsApp client...');
  waStatus = 'initializing';

  client = new Client({
    authStrategy: new LocalAuth({ dataPath: '.wwebjs_auth' }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--no-zygote'],
    },
  });

  client.on('qr', async (qr) => {
    console.log('WhatsApp QR ready — scan with your phone');
    waStatus = 'qr_ready';
    qrDataUrl = await qrcode.toDataURL(qr).catch(() => null);
  });

  client.on('authenticated', () => { qrDataUrl = null; });

  client.on('ready', () => {
    console.log('WhatsApp ready');
    waStatus = 'ready';
    qrDataUrl = null;
  });

  client.on('auth_failure', () => { waStatus = 'disconnected'; client = null; });

  client.on('disconnected', () => {
    waStatus = 'disconnected';
    qrDataUrl = null;
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
    // Получаем реальный ID номера — решает ошибку "No LID for user"
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
};

export const reconnectWhatsApp = async () => {
  if (client) await client.destroy().catch(() => {});
  client = null;
  qrDataUrl = null;
  waStatus = 'disconnected';
  initWhatsApp();
};
