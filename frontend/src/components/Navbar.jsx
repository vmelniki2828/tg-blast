import { NavLink } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getBotStatus } from '../api/index.js';
import { getWaStatus } from '../api/index.js';

const NAV = [
  { to: '/',           label: '📊 Дашборд' },
  { to: '/contacts',   label: '👥 Контакты' },
  { to: '/campaigns',  label: '📨 Рассылка' },
  { to: '/history',    label: '📋 История' },
  { to: '/whatsapp',   label: '💬 WhatsApp' },
  { to: '/accounts',   label: '📱 WA Аккаунты' },
];

export default function Navbar() {
  const [bot, setBot] = useState(null);
  const [waStatus, setWaStatus] = useState(null);

  useEffect(() => {
    getBotStatus()
      .then(r => setBot(r.data.bot))
      .catch(() => setBot(false));

    const pollWa = () =>
      getWaStatus()
        .then(r => setWaStatus(r.data.status))
        .catch(() => setWaStatus('disconnected'));

    pollWa();
    const t = setInterval(pollWa, 5000);
    return () => clearInterval(t);
  }, []);

  const waColor = waStatus === 'ready' ? 'var(--success)' : waStatus === 'qr_ready' ? 'var(--warning)' : 'var(--danger)';
  const waLabel = waStatus === 'ready' ? '✓ WA подключён' : waStatus === 'qr_ready' ? '⏳ Ожидает QR' : waStatus === 'initializing' ? '⏳ Запуск...' : '✗ WA отключён';

  return (
    <nav style={{
      width: 220,
      minHeight: '100vh',
      background: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 0',
      flexShrink: 0,
    }}>
      <div style={{ padding: '0 20px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 8 }}>📡 TG Blast</div>

        {/* Telegram */}
        {bot === null && <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Проверка бота...</div>}
        {bot === false && <div style={{ color: 'var(--danger)', fontSize: 12 }}>⚠ Telegram не подключён</div>}
        {bot && <div style={{ color: 'var(--success)', fontSize: 12 }}>✓ TG: @{bot.username}</div>}

        {/* WhatsApp */}
        {waStatus !== null && (
          <div style={{ color: waColor, fontSize: 12, marginTop: 3 }}>{waLabel}</div>
        )}
      </div>

      <div style={{ padding: '16px 12px', flex: 1 }}>
        {NAV.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            style={({ isActive }) => ({
              display: 'block',
              padding: '10px 12px',
              borderRadius: 8,
              marginBottom: 4,
              color: isActive ? 'var(--accent)' : 'var(--text)',
              background: isActive ? 'rgba(78,158,255,0.1)' : 'transparent',
              fontWeight: isActive ? 600 : 400,
              transition: 'all 0.15s',
            })}
          >
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
