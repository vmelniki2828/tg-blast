# TG Blast — Telegram Mass Sender

Приложение для массовой рассылки сообщений через Telegram Bot API.

## Стек
- **Frontend**: React 18 + Vite + React Router
- **Backend**: Node.js + Express
- **Database**: MongoDB + Mongoose
- **Telegram**: Bot API (через axios)
- **Планировщик**: node-cron (проверка каждые 30 сек)

## Быстрый старт

### 1. Получить токен бота
Создайте бота через [@BotFather](https://t.me/BotFather) и скопируйте токен.

> ⚠️ Бот может отправлять сообщения только тем пользователям, которые **сначала написали боту** (нажали /start). Сохраните их chat_id.

### 2. Настроить backend

```bash
cd backend
cp .env.example .env
# Откройте .env и вставьте токен и строку MongoDB
npm install
npm run dev
```

Содержимое `.env`:
```
PORT=3001
MONGODB_URI=mongodb://localhost:27017/tg_blast
BOT_TOKEN=1234567890:AAFxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 3. Запустить frontend

```bash
cd frontend
npm install
npm run dev
```

Открыть: **http://localhost:5173**

### 4. MongoDB
Убедитесь, что MongoDB запущена локально:
```bash
# Windows (если установлена как сервис)
net start MongoDB

# Или через mongosh
mongosh
```

## Как получить chat_id пользователя

1. Пользователь пишет боту `/start` или любое сообщение
2. Перейдите: `https://api.telegram.org/bot<TOKEN>/getUpdates`
3. В ответе найдите `message.chat.id` — это и есть chat_id

## Функциональность

| Раздел | Функции |
|---|---|
| Контакты | Добавление, редактирование, удаление, теги, поиск |
| Рассылки | Немедленная или отложенная, всем / выбранным |
| История | Лог каждой отправки со статусом и ошибкой |
| Дашборд | Общая статистика |

## API эндпоинты

```
GET    /api/contacts          — список контактов
POST   /api/contacts          — создать контакт
PUT    /api/contacts/:id      — обновить
DELETE /api/contacts/:id      — удалить

GET    /api/campaigns         — список рассылок
POST   /api/campaigns         — создать и запустить
DELETE /api/campaigns/:id     — отменить (только pending)

GET    /api/logs              — история отправок
GET    /api/telegram/status   — статус бота
POST   /api/telegram/test     — тестовая отправка { chatId, text }
```
