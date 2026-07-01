import axios from 'axios';

const BASE_URL = process.env.EVOLUTION_URL || 'http://localhost:8080';
const API_KEY  = process.env.EVOLUTION_API_KEY || 'tgblast_evolution_key';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { apikey: API_KEY },
});

// ─── Инстансы ───────────────────────────────────────────────────────────────

export const createInstance = (name) =>
  api.post('/instance/create', { instanceName: name, qrcode: true }).then(r => r.data);

export const getInstanceState = (name) =>
  api.get(`/instance/connectionState/${name}`).then(r => r.data).catch(() => null);

export const getAllInstances = () =>
  api.get('/instance/fetchInstances').then(r => r.data).catch(() => []);

export const deleteInstance = (name) =>
  api.delete(`/instance/delete/${name}`).then(r => r.data);

export const logoutInstance = (name) =>
  api.delete(`/instance/logout/${name}`).then(r => r.data);

// ─── Подключение ────────────────────────────────────────────────────────────

export const getQrCode = (name) =>
  api.get(`/instance/connect/${name}`).then(r => r.data).catch(() => null);

export const getPairingCode = (name, phoneNumber) =>
  api.post(`/instance/connect/${name}`, { number: phoneNumber }).then(r => r.data);

// ─── Отправка ────────────────────────────────────────────────────────────────

export const sendText = async (instanceName, phone, text) => {
  try {
    const digits = phone.replace(/\D/g, '');
    const res = await api.post(`/message/sendText/${instanceName}`, {
      number: digits,
      text,
    });
    return { ok: true, data: res.data };
  } catch (err) {
    return { ok: false, error: err.response?.data?.message || err.message };
  }
};

// ─── Проверка доступности Evolution API ─────────────────────────────────────

export const checkEvolutionHealth = async () => {
  try {
    await api.get('/');
    return true;
  } catch {
    return false;
  }
};
