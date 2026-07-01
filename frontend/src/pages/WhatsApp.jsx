import { useEffect, useState, useRef } from 'react';
import { getWaStatus, getWaQr, waConnectByPhone, waConnectByQr, sendWaTest, waLogout } from '../api/index.js';

const STATUS_LABELS = {
  disconnected:  { label: 'Отключён',              color: 'var(--danger)' },
  initializing:  { label: 'Инициализация...',       color: 'var(--warning)' },
  qr_ready:      { label: 'Ожидает подтверждения',  color: 'var(--warning)' },
  ready:         { label: 'Подключён',              color: 'var(--success)' },
  unavailable:   { label: 'Не установлен',          color: 'var(--text-muted)' },
};

export default function WhatsApp() {
  const [status, setStatus] = useState('disconnected');
  const [pairingCode, setPairingCode] = useState(null);
  const [qr, setQr] = useState(null);
  const [phone, setPhone] = useState('');
  const [mode, setMode] = useState('phone'); // 'phone' | 'qr'
  const [testPhone, setTestPhone] = useState('');
  const [testText, setTestText] = useState('Тестовое сообщение из TG Blast 👋');
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const pollRef = useRef(null);

  const refresh = async () => {
    try {
      const r = await getWaStatus();
      setStatus(r.data.status);
      setPairingCode(r.data.pairingCode || null);

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

  const handleConnectPhone = async (e) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setLoading(true);
    setPairingCode(null);
    setQr(null);
    await waConnectByPhone(phone.replace(/\D/g, ''));
    setStatus('initializing');
    setLoading(false);
  };

  const handleConnectQr = async () => {
    setLoading(true);
    setPairingCode(null);
    setQr(null);
    await waConnectByQr();
    setStatus('initializing');
    setLoading(false);
  };

  const handleLogout = async () => {
    if (!confirm('Выйти из WhatsApp?')) return;
    await waLogout();
    setStatus('disconnected');
    setPairingCode(null);
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
    <div style={{ maxWidth: 580 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>WhatsApp</h1>

      {/* Статус */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Статус</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: st.color, display: 'inline-block' }} />
              <span style={{ fontWeight: 600, color: st.color }}>{st.label}</span>
              {(status === 'initializing') && <div className="spinner" style={{ width: 14, height: 14 }} />}
            </div>
          </div>
          {status === 'ready' && (
            <button className="btn-danger btn-sm" onClick={handleLogout}>Выйти</button>
          )}
        </div>
      </div>

      {/* Форма подключения */}
      {(status === 'disconnected') && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Подключить аккаунт</h2>

          {/* Переключатель режима */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <button
              className={mode === 'phone' ? 'btn-primary' : 'btn-secondary'}
              onClick={() => setMode('phone')}
              style={{ flex: 1 }}
            >
              📱 По номеру телефона
            </button>
            <button
              className={mode === 'qr' ? 'btn-primary' : 'btn-secondary'}
              onClick={() => setMode('qr')}
              style={{ flex: 1 }}
            >
              📷 По QR коду
            </button>
          </div>

          {mode === 'phone' ? (
            <form onSubmit={handleConnectPhone}>
              <div className="form-group">
                <label>Номер телефона WhatsApp аккаунта</label>
                <input
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="79001234567"
                  required
                  style={{ fontSize: 16 }}
                />
                <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 6 }}>
                  Введите номер без + и пробелов. Вам придёт 8-значный код.
                </div>
              </div>
              <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
                {loading ? 'Запуск...' : 'Получить код'}
              </button>
            </form>
          ) : (
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
                Нажмите кнопку — QR код появится через 15–20 сек. Отсканируйте его в WhatsApp.
              </p>
              <button className="btn-primary" onClick={handleConnectQr} disabled={loading} style={{ width: '100%' }}>
                {loading ? 'Запуск...' : 'Показать QR код'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Pairing code */}
      {pairingCode && status !== 'ready' && (
        <div className="card" style={{ marginBottom: 20, textAlign: 'center', borderColor: 'rgba(78,158,255,0.4)' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 12 }}>
            Введите этот код в WhatsApp на телефоне:
          </div>
          <div style={{
            fontSize: 36, fontWeight: 800, letterSpacing: 8,
            color: 'var(--accent)', fontFamily: 'monospace',
            background: 'var(--surface2)', borderRadius: 10,
            padding: '16px 24px', display: 'inline-block', marginBottom: 16,
          }}>
            {pairingCode}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.7 }}>
            WhatsApp → Настройки → Связанные устройства<br />
            → Привязать устройство → <strong style={{ color: 'var(--text)' }}>Введите номер телефона</strong>
          </div>
        </div>
      )}

      {/* QR code */}
      {qr && !pairingCode && status !== 'ready' && (
        <div className="card" style={{ marginBottom: 20, textAlign: 'center' }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Отсканируйте QR код</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
            WhatsApp → Настройки → Связанные устройства → Привязать устройство
          </div>
          <img src={qr} alt="QR" style={{ width: 220, height: 220, borderRadius: 12, border: '3px solid var(--border)' }} />
        </div>
      )}

      {/* Initializing */}
      {status === 'initializing' && !pairingCode && !qr && (
        <div className="card" style={{ marginBottom: 20, textAlign: 'center', padding: 40 }}>
          <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 12px' }} />
          <div style={{ color: 'var(--text-muted)' }}>Запуск клиента... (~15–30 сек)</div>
        </div>
      )}

      {/* Подключён */}
      {status === 'ready' && (
        <>
          <div className="card" style={{ marginBottom: 20, textAlign: 'center', borderColor: 'rgba(52,201,132,0.3)' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
            <div style={{ fontWeight: 600, color: 'var(--success)' }}>WhatsApp подключён!</div>
          </div>

          <div className="card">
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Тестовая отправка</h2>
            <form onSubmit={handleTest}>
              <div className="form-group">
                <label>Номер получателя (79001234567)</label>
                <input value={testPhone} onChange={e => setTestPhone(e.target.value)} placeholder="79001234567" required />
              </div>
              <div className="form-group">
                <label>Текст</label>
                <textarea value={testText} onChange={e => setTestText(e.target.value)} required />
              </div>
              {testResult && (
                testResult.ok
                  ? <p className="success-msg">✓ Отправлено!</p>
                  : <p className="error-msg">✕ {testResult.error}</p>
              )}
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Отправка...' : 'Отправить тест'}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
