import { useEffect, useState, useRef } from 'react';
import { getWaStatus, getWaQr, sendWaTest, waLogout, waReconnect } from '../api/index.js';

const STATUS_LABELS = {
  disconnected: { label: 'Отключён', color: 'var(--danger)' },
  initializing: { label: 'Инициализация...', color: 'var(--warning)' },
  qr_ready:     { label: 'Ожидает сканирования QR', color: 'var(--warning)' },
  ready:        { label: 'Подключён', color: 'var(--success)' },
};

export default function WhatsApp() {
  const [status, setStatus] = useState('disconnected');
  const [qr, setQr] = useState(null);
  const [testPhone, setTestPhone] = useState('');
  const [testText, setTestText] = useState('Тестовое сообщение из TG Blast 👋');
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const pollRef = useRef(null);

  const refresh = async () => {
    try {
      const r = await getWaStatus();
      setStatus(r.data.status);

      if (r.data.hasQr) {
        const qrRes = await getWaQr().catch(() => null);
        setQr(qrRes?.data?.qr || null);
      } else {
        setQr(null);
      }
    } catch {
      setStatus('disconnected');
    }
  };

  useEffect(() => {
    refresh();
    pollRef.current = setInterval(refresh, 3000);
    return () => clearInterval(pollRef.current);
  }, []);

  const handleReconnect = async () => {
    setLoading(true);
    await waReconnect();
    setStatus('initializing');
    setQr(null);
    setLoading(false);
  };

  const handleLogout = async () => {
    if (!confirm('Выйти из WhatsApp? Потребуется повторное сканирование QR.')) return;
    await waLogout();
    setStatus('disconnected');
    setQr(null);
  };

  const handleTest = async (e) => {
    e.preventDefault();
    setTestResult(null);
    setLoading(true);
    try {
      const r = await sendWaTest({ phone: testPhone, text: testText });
      setTestResult(r.data);
    } catch (err) {
      setTestResult({ ok: false, error: err.response?.data?.error || err.message });
    } finally {
      setLoading(false);
    }
  };

  const st = STATUS_LABELS[status] || STATUS_LABELS.disconnected;

  return (
    <div style={{ maxWidth: 620 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>WhatsApp</h1>

      {/* Статус */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Статус подключения</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: st.color, display: 'inline-block' }} />
              <span style={{ fontWeight: 600, color: st.color }}>{st.label}</span>
              {status === 'initializing' && <div className="spinner" style={{ width: 14, height: 14 }} />}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {status !== 'ready' && (
              <button className="btn-primary btn-sm" onClick={handleReconnect} disabled={loading || status === 'initializing'}>
                ↻ Подключить
              </button>
            )}
            {status === 'ready' && (
              <button className="btn-danger btn-sm" onClick={handleLogout}>Выйти</button>
            )}
          </div>
        </div>
      </div>

      {/* QR Code */}
      {status === 'qr_ready' && (
        <div className="card" style={{ marginBottom: 20, textAlign: 'center' }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Отсканируйте QR код</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
            Откройте WhatsApp на телефоне → Настройки → Связанные устройства → Привязать устройство
          </div>
          {qr ? (
            <img
              src={qr}
              alt="WhatsApp QR"
              style={{ width: 240, height: 240, borderRadius: 12, border: '3px solid var(--border)' }}
            />
          ) : (
            <div style={{ padding: 40 }}><div className="spinner" /></div>
          )}
          <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 12 }}>
            QR обновляется автоматически каждые 3 сек
          </div>
        </div>
      )}

      {/* Успешное подключение */}
      {status === 'ready' && (
        <div className="card" style={{ marginBottom: 20, textAlign: 'center', borderColor: 'rgba(52,201,132,0.3)' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
          <div style={{ fontWeight: 600, color: 'var(--success)' }}>WhatsApp подключён!</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
            Можно создавать рассылки с каналом WhatsApp или Both
          </div>
        </div>
      )}

      {/* Тестовая отправка */}
      {status === 'ready' && (
        <div className="card">
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Тестовая отправка</h2>
          <form onSubmit={handleTest}>
            <div className="form-group">
              <label>Номер телефона (без +, напр. 79001234567)</label>
              <input
                value={testPhone}
                onChange={e => setTestPhone(e.target.value)}
                placeholder="79001234567"
                required
              />
            </div>
            <div className="form-group">
              <label>Текст сообщения</label>
              <textarea value={testText} onChange={e => setTestText(e.target.value)} required />
            </div>
            {testResult && (
              testResult.ok
                ? <p className="success-msg">✓ Сообщение отправлено!</p>
                : <p className="error-msg">✕ {testResult.error}</p>
            )}
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Отправка...' : 'Отправить тест'}
            </button>
          </form>
        </div>
      )}

      {/* Инструкция для отключённого */}
      {(status === 'disconnected') && (
        <div className="card" style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>
          <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>Как подключить:</div>
          <ol style={{ paddingLeft: 18 }}>
            <li>Нажмите кнопку <strong style={{ color: 'var(--accent)' }}>Подключить</strong></li>
            <li>Дождитесь появления QR кода (10–20 сек)</li>
            <li>В WhatsApp: Настройки → Связанные устройства → Привязать устройство</li>
            <li>Отсканируйте QR код</li>
            <li>Статус изменится на «Подключён»</li>
          </ol>
          <div style={{ marginTop: 12, fontSize: 12 }}>
            ⚠ Требуется Chromium/Chrome на компьютере (используется для WhatsApp Web)
          </div>
        </div>
      )}
    </div>
  );
}
