/**
 * Прогрев WA-аккаунтов: отмеченные аккаунты периодически шлют друг
 * другу небольшие сообщения, имитируя живую переписку. Задача — чтобы
 * аккаунт выглядел для WhatsApp как обычный активный пользователь
 * ещё до того, как с него начнут слать рассылки.
 */

import cron from 'node-cron';
import { WaAccounts } from '../store/index.js';
import { sendViaClient } from './waPoolService.js';

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

const MESSAGES = [
  'привет 👋', 'как дела?', 'норм, у тебя как?', 'да ничего так, работаю',
  'что делаешь?', 'да так, отдыхаю', 'го на выходных созвонимся',
  'окей, давай', 'смотрел что нового?', 'не, посоветуй что-нибудь',
  'ахах точно', 'согласен', 'как погода у вас?', 'солнечно сегодня',
  'красота вообще', 'слушай, а ты как вообще?', 'все путём, спасибо',
  'кстати да', 'ну такое', 'сто пудов',
];

const randomMessage = () => MESSAGES[Math.floor(Math.random() * MESSAGES.length)];

// Дневной лимит прогрева растёт вместе с возрастом аккаунта — резкий
// всплеск активности у только что привязанного номера сам по себе
// выглядит подозрительно.
const dailyCapFor = (account) => {
  const ageDays = Math.floor((Date.now() - new Date(account.createdAt).getTime()) / 86_400_000);
  return Math.min(3 + ageDays * 2, 20);
};

const canSend = (account) => (account.warmupSentToday || 0) < dailyCapFor(account);

const exchangeOnce = async (a, b) => {
  const resAB = await sendViaClient(a._id, b.phone, randomMessage()).catch(() => ({ ok: false }));
  if (resAB.ok) {
    WaAccounts.update(a._id, {
      warmupSentToday: (a.warmupSentToday || 0) + 1,
      warmupSentTotal: (a.warmupSentTotal || 0) + 1,
    });
  }

  // Не всегда отвечают сразу — иногда просто прочитали и всё
  if (Math.random() < 0.6) {
    await delay(4000 + Math.random() * 15000);
    const freshB = WaAccounts.getById(b._id);
    if (freshB && canSend(freshB)) {
      const resBA = await sendViaClient(b._id, a.phone, randomMessage()).catch(() => ({ ok: false }));
      if (resBA.ok) {
        WaAccounts.update(b._id, {
          warmupSentToday: (freshB.warmupSentToday || 0) + 1,
          warmupSentTotal: (freshB.warmupSentTotal || 0) + 1,
        });
      }
    }
  }
};

const tick = async () => {
  const pool = WaAccounts.getWarmupPool().filter(canSend);
  if (pool.length < 2) return;

  // За один тик — одна случайная пара, чтобы не устраивать залповую
  // переписку у всех сразу.
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const [a, b] = shuffled;
  console.log(`[warmup] ${a.label} ⇄ ${b.label}`);
  await exchangeOnce(a, b).catch((err) => console.error('[warmup] error:', err.message));
};

export const startWarmupScheduler = () => {
  // Раз в 5 минут, с шансом 50% — редкая, не роботизированная частота.
  cron.schedule('*/5 * * * *', () => {
    if (Math.random() < 0.5) tick().catch(console.error);
  });
  console.log('Warmup scheduler started (~every 10 min on average)');

  // Полночь — сброс дневных счётчиков (прогрев и обычные рассылки).
  cron.schedule('0 0 * * *', () => {
    console.log('Resetting daily WA account counters');
    WaAccounts.resetDailyCounters();
  });
};
