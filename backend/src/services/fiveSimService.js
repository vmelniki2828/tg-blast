import axios from 'axios';

const BASE = 'https://5sim.net/v1';

const api = () => axios.create({
  baseURL: BASE,
  headers: { Authorization: `Bearer ${process.env.FIVESIM_API_KEY || ''}` },
});

/**
 * Купить номер для WhatsApp.
 * country: 'russia', 'ukraine', 'any', etc.
 */
export const buyNumber = async (country = 'any') => {
  try {
    const r = await api().get(`/user/buy/activation/${country}/any/whatsapp`);
    return { ok: true, data: r.data }; // { id, phone, operator, product, price, status }
  } catch (err) {
    return { ok: false, error: err.response?.data || err.message };
  }
};

/**
 * Проверить статус и получить SMS код.
 * Возвращает код если SMS пришла, или null если ещё ждём.
 */
export const checkSms = async (orderId) => {
  try {
    const r = await api().get(`/user/check/${orderId}`);
    const { sms, status } = r.data;
    if (status === 'RECEIVED' && sms?.length > 0) {
      return { ok: true, code: sms[0].code, status };
    }
    return { ok: false, status, code: null };
  } catch (err) {
    return { ok: false, error: err.message };
  }
};

/**
 * Подтвердить использование номера (после успешной регистрации).
 */
export const confirmOrder = async (orderId) => {
  try {
    await api().get(`/user/finish/${orderId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
};

/**
 * Отменить заказ (если не пришла SMS).
 */
export const cancelOrder = async (orderId) => {
  try {
    await api().get(`/user/cancel/${orderId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
};

/**
 * Баланс аккаунта 5sim.
 */
export const getBalance = async () => {
  try {
    const r = await api().get('/user/profile');
    return { ok: true, balance: r.data.balance };
  } catch (err) {
    return { ok: false, error: err.message };
  }
};

/**
 * Ждать SMS с кодом (polling до 5 минут).
 */
export const waitForSms = async (orderId, timeoutMs = 300_000) => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const result = await checkSms(orderId);
    if (result.ok && result.code) return result;
    if (result.status === 'CANCELED') return { ok: false, error: 'Заказ отменён' };
    await new Promise(r => setTimeout(r, 5000)); // проверять каждые 5 сек
  }
  return { ok: false, error: 'Таймаут ожидания SMS' };
};
