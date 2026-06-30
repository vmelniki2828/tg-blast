import axios from 'axios';

const tgApi = (method, data) => {
  const token = process.env.BOT_TOKEN;
  if (!token) throw new Error('BOT_TOKEN is not set');
  return axios.post(`https://api.telegram.org/bot${token}/${method}`, data);
};

/**
 * Отправить сообщение одному получателю.
 * @returns {{ ok: boolean, error?: string }}
 */
export const sendMessage = async (chatId, text) => {
  try {
    await tgApi('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    });
    return { ok: true };
  } catch (err) {
    const error = err.response?.data?.description || err.message;
    return { ok: false, error };
  }
};

/**
 * Проверить токен — возвращает информацию о боте или null.
 */
export const getBotInfo = async () => {
  try {
    const res = await tgApi('getMe', {});
    return res.data.result;
  } catch {
    return null;
  }
};
