import cron from 'node-cron';
import { Campaigns, Contacts, SendLogs } from '../store/index.js';
import { sendMessage as sendTelegram } from './telegramService.js';
import { sendWhatsApp, getWaStatus } from './whatsappService.js';
import { sendViaPool } from './waPoolService.js';
import { WaAccounts } from '../store/index.js';

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

const sendOne = async ({ campaign, contact, text, channel }) => {
  let result;

  if (channel === 'telegram') {
    if (!contact.chatId) {
      result = { ok: false, error: 'Нет chatId для Telegram' };
    } else {
      result = await sendTelegram(contact.chatId, text);
    }
    await SendLogs.create({
      campaign: campaign._id,
      contact: contact._id,
      chatId: contact.chatId || '',
      channel: 'telegram',
      status: result.ok ? 'sent' : 'failed',
      error: result.error || null,
    });

  } else if (channel === 'whatsapp') {
    if (!contact.phone) {
      result = { ok: false, error: 'Нет phone для WhatsApp' };
    } else {
      // Сначала пробуем пул аккаунтов, потом одиночный клиент
      const poolReady = WaAccounts.getLeastLoaded();
      if (poolReady) {
        result = await sendViaPool(contact.phone, text);
      } else if (getWaStatus().status === 'ready') {
        result = await sendWhatsApp(contact.phone, text);
      } else {
        result = { ok: false, error: 'Нет готовых WhatsApp аккаунтов' };
      }
    }
    await SendLogs.create({
      campaign: campaign._id,
      contact: contact._id,
      chatId: contact.phone || '',
      channel: 'whatsapp',
      status: result.ok ? 'sent' : 'failed',
      error: result.error || null,
    });
  }

  return result;
};

export const runCampaign = async (campaign) => {
  let contacts;
  if (campaign.recipients === 'all') {
    contacts = await Contacts.find({ active: true });
  } else {
    contacts = await Contacts.find({ _id: { $in: campaign.recipients }, active: true });
  }

  const channel = campaign.channel || 'telegram';
  const totalOps = channel === 'both' ? contacts.length * 2 : contacts.length;

  await Campaigns.findByIdAndUpdate(campaign._id, {
    status: 'sending',
    sentAt: new Date(),
    'stats.total': totalOps,
  });

  let sent = 0;
  let failed = 0;

  for (const contact of contacts) {
    const channels = channel === 'both' ? ['telegram', 'whatsapp'] : [channel];
    for (const ch of channels) {
      const result = await sendOne({ campaign, contact, text: campaign.text, channel: ch });
      if (result?.ok) sent++;
      else failed++;
      // Для WhatsApp — случайная пауза 5-15с между сообщениями вместо
      // фиксированной. Одинаковый интервал между отправками — один из
      // главных сигналов, по которым WhatsApp детектит бота и банит номер.
      await delay(ch === 'telegram' ? 50 : 5000 + Math.random() * 10000);
    }
  }

  await Campaigns.findByIdAndUpdate(campaign._id, {
    status: failed === totalOps && totalOps > 0 ? 'failed' : 'done',
    'stats.sent': sent,
    'stats.failed': failed,
  });

  console.log(`Campaign "${campaign.title}" [${channel}] done: ${sent} sent, ${failed} failed`);
};

export const startScheduler = () => {
  cron.schedule('*/30 * * * * *', async () => {
    const now = new Date();
    const due = await Campaigns.find({
      status: 'pending',
      scheduledAt: { $ne: null, $lte: now },
    });
    for (const campaign of due) {
      console.log(`Starting scheduled campaign: ${campaign.title}`);
      runCampaign(campaign).catch(console.error);
    }
  });
  console.log('Scheduler started (every 30s check)');
};
