/**
 * In-memory хранилище — заменяет MongoDB для быстрого теста.
 * Данные живут пока запущен сервер, кроме WaAccounts — тот пул
 * сохраняется на диск, т.к. переподключать WhatsApp-аккаунты
 * заново при каждом рестарте backend неудобно.
 */

import fs from 'fs';
import path from 'path';

const makeId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const now = () => new Date();

const DATA_DIR = path.resolve('.data');
const WA_ACCOUNTS_FILE = path.join(DATA_DIR, 'wa-accounts.json');

// ─── Contacts ───────────────────────────────────────────────────────────────

let contacts = [];

export const Contacts = {
  find(filter = {}) {
    let result = [...contacts];
    if (filter.active !== undefined) result = result.filter(c => c.active === filter.active);
    if (filter.tags)   result = result.filter(c => c.tags.includes(filter.tags));
    if (filter.$or)    result = result.filter(c =>
      filter.$or.some(cond => {
        const [key, val] = Object.entries(cond)[0];
        const regex = new RegExp(val.$regex, val.$options || '');
        return regex.test(c[key] || '');
      })
    );
    if (filter._id?.$in) result = result.filter(c => filter._id.$in.includes(c._id));
    return Promise.resolve(result.sort((a, b) => b.createdAt - a.createdAt));
  },

  findById(id) {
    return Promise.resolve(contacts.find(c => c._id === id) || null);
  },

  create(data) {
    const contact = {
      _id: makeId(),
      name: data.name || '',
      chatId: data.chatId || '',
      username: data.username || '',
      phone: data.phone || '',
      tags: Array.isArray(data.tags) ? data.tags : [],
      notes: data.notes || '',
      active: data.active !== undefined ? data.active : true,
      createdAt: now(),
      updatedAt: now(),
    };
    contacts.push(contact);
    return Promise.resolve(contact);
  },

  findByIdAndUpdate(id, data) {
    const i = contacts.findIndex(c => c._id === id);
    if (i === -1) return Promise.resolve(null);
    contacts[i] = { ...contacts[i], ...data, updatedAt: now() };
    return Promise.resolve(contacts[i]);
  },

  findByIdAndDelete(id) {
    const i = contacts.findIndex(c => c._id === id);
    if (i === -1) return Promise.resolve(null);
    const [deleted] = contacts.splice(i, 1);
    return Promise.resolve(deleted);
  },

  distinct(field) {
    const vals = contacts.flatMap(c => c[field] || []);
    return Promise.resolve([...new Set(vals)].filter(Boolean));
  },
};

// ─── Campaigns ──────────────────────────────────────────────────────────────

let campaigns = [];

export const Campaigns = {
  find(filter = {}) {
    let result = [...campaigns];
    if (filter.status) result = result.filter(c => c.status === filter.status);
    if (filter.scheduledAt) {
      if (filter.scheduledAt.$ne !== undefined) result = result.filter(c => c.scheduledAt !== null);
      if (filter.scheduledAt.$lte) result = result.filter(c => c.scheduledAt && c.scheduledAt <= filter.scheduledAt.$lte);
    }
    return Promise.resolve(result.sort((a, b) => b.createdAt - a.createdAt));
  },

  findById(id) {
    return Promise.resolve(campaigns.find(c => c._id === id) || null);
  },

  create(data) {
    const campaign = {
      _id: makeId(),
      title: data.title || '',
      text: data.text || '',
      recipients: data.recipients ?? 'all',
      channel: data.channel || 'telegram',
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
      status: 'pending',
      sentAt: null,
      stats: { total: 0, sent: 0, failed: 0 },
      createdAt: now(),
      updatedAt: now(),
    };
    campaigns.push(campaign);
    return Promise.resolve(campaign);
  },

  findByIdAndUpdate(id, updateData) {
    const i = campaigns.findIndex(c => c._id === id);
    if (i === -1) return Promise.resolve(null);
    // Поддержка dot-notation ('stats.sent')
    const flat = { ...updateData };
    for (const key of Object.keys(flat)) {
      if (key.includes('.')) {
        const [obj, prop] = key.split('.');
        campaigns[i][obj] = { ...campaigns[i][obj], [prop]: flat[key] };
        delete flat[key];
      }
    }
    campaigns[i] = { ...campaigns[i], ...flat, updatedAt: now() };
    return Promise.resolve(campaigns[i]);
  },
};

// ─── SendLogs ───────────────────────────────────────────────────────────────

let sendLogs = [];

export const SendLogs = {
  find(filter = {}) {
    let result = [...sendLogs];
    if (filter.campaign) result = result.filter(l => l.campaign === filter.campaign);
    if (filter.status)   result = result.filter(l => l.status === filter.status);
    if (filter.channel)  result = result.filter(l => l.channel === filter.channel);
    result = result.sort((a, b) => b.sentAt - a.sentAt);

    // Имитация populate
    const populate = (log) => ({
      ...log,
      contact: contacts.find(c => c._id === log.contact) || null,
      campaign: campaigns.find(c => c._id === log.campaign) || null,
    });

    return {
      populate: () => ({
        populate: () => ({
          sort: () => ({
            limit: (n) => Promise.resolve(result.slice(0, n).map(populate)),
          }),
        }),
      }),
    };
  },

  create(data) {
    const log = {
      _id: makeId(),
      campaign: data.campaign,
      contact: data.contact,
      chatId: data.chatId || '',
      channel: data.channel,
      status: data.status,
      error: data.error || null,
      sentAt: now(),
    };
    sendLogs.push(log);
    return Promise.resolve(log);
  },
};

// ─── WA Accounts (Evolution API pool) ───────────────────────────────────────

const loadWaAccounts = () => {
  try {
    const raw = fs.readFileSync(WA_ACCOUNTS_FILE, 'utf-8');
    // При загрузке сокеты ещё не подняты — сбрасываем живое состояние,
    // reconnectAllAccounts() в waPoolService переустановит его сам.
    return JSON.parse(raw).map(a => ({
      ...a,
      status: 'connecting',
      qr: null,
      pairingCode: null,
      warmup: a.warmup || false,
      warmupSentToday: a.warmupSentToday || 0,
      warmupSentTotal: a.warmupSentTotal || 0,
      createdAt: new Date(a.createdAt),
      lastUsed: a.lastUsed ? new Date(a.lastUsed) : null,
    }));
  } catch {
    return [];
  }
};

const persistWaAccounts = () => {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(WA_ACCOUNTS_FILE, JSON.stringify(waAccounts, null, 2));
  } catch (err) {
    console.error('Не удалось сохранить пул WA аккаунтов:', err.message);
  }
};

let waAccounts = loadWaAccounts();

export const WaAccounts = {
  getAll() {
    return [...waAccounts];
  },
  getById(id) {
    return waAccounts.find(a => a._id === id) || null;
  },
  getReady() {
    return waAccounts.filter(a => a.status === 'ready');
  },
  create(data) {
    const account = {
      _id: makeId(),
      instanceName: data.instanceName,
      phone: data.phone || '',
      label: data.label || data.phone || data.instanceName,
      status: 'disconnected', // disconnected | connecting | ready | banned
      sentToday: 0,
      sentTotal: 0,
      lastUsed: null,
      fiveSimOrderId: data.fiveSimOrderId || null,
      qr: null,
      pairingCode: null,
      error: null,
      warmup: false,
      warmupSentToday: 0,
      warmupSentTotal: 0,
      createdAt: now(),
    };
    waAccounts.push(account);
    persistWaAccounts();
    return account;
  },
  update(id, data) {
    const i = waAccounts.findIndex(a => a._id === id);
    if (i === -1) return null;
    waAccounts[i] = { ...waAccounts[i], ...data };
    persistWaAccounts();
    return waAccounts[i];
  },
  delete(id) {
    const i = waAccounts.findIndex(a => a._id === id);
    if (i === -1) return false;
    waAccounts.splice(i, 1);
    persistWaAccounts();
    return true;
  },
  // Выбрать наименее загруженный готовый аккаунт
  getLeastLoaded() {
    const ready = waAccounts.filter(a => a.status === 'ready');
    if (!ready.length) return null;
    return ready.sort((a, b) => a.sentToday - b.sentToday)[0];
  },
  // Сбросить счётчики отправок (вызывать каждую ночь)
  resetDailyCounters() {
    waAccounts.forEach(a => { a.sentToday = 0; a.warmupSentToday = 0; });
    persistWaAccounts();
  },
  // Аккаунты, отмеченные для прогрева и готовые к отправке
  getWarmupPool() {
    return waAccounts.filter(a => a.warmup && a.status === 'ready');
  },
};
