import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

const COUNTRIES = [
  { value: 'any',        label: '🌍 Любая' },
  { value: 'russia',     label: '🇷🇺 Россия' },
  { value: 'ukraine',    label: '🇺🇦 Украина' },
  { value: 'kazakhstan', label: '🇰🇿 Казахстан' },
  { value: 'indonesia',  label: '🇮🇩 Индонезия' },
];

const STEPS = [
  { id: 'start',           label: 'Покупка номера' },
  { id: 'register',        label: 'Регистрация в WA' },
  { id: 'sms',             label: 'Ожидание SMS' },
  { id: 'pairing',         label: 'Pairing code' },
  { id: 'done',            label: 'Готово' },
];

export default function AccountWizard({ onClose, onDone }) {
  const [step, setStep]             = useState('start');
  const [country, setCountry]       = useState('any');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [session, setSession]       = useState(null); // { orderId, phone, accountId }
  const [smsCode, setSmsCode]       = useState(null);
  const [pairingCode, setPairingCode] = useState(null);
  const pollRef = useRef(null);

  // Остановить polling при unmount
  useEffect(() => () => clearInterval(pollRef.current), []);

  const startPolling = (orderId) => {
    pollRef.current = setInterval(async () => {
      try {
        const r = await api.get(`/wizard/${orderId}/status`);
        const { smsCode: code, pairingCode: pc, status } = r.data;

        if (code && !smsCode) {
          setSmsCode(code);
          setStep('pairing_prompt'); // показываем код пользователю
        }
        if (pc && !pairingCode) {
          setPairingCode(pc);
          setStep('pairing');
          clearInterval(pollRef.current);
        }
        if (status === 'error') {
          setError('Ошибка подключения');
          clearInterval(pollRef.current);
        }
      } catch {}
    }, 3000);
  };

  const handleStart = async () => {
    setError('');
    setLoading(true);
    try {
      const r = await api.post('/wizard/start', { country });
      setSession(r.data);
      setStep('register');
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSmsSent = async () => {
    await api.post(`/wizard/${session.orderId}/sms-sent`);
    setStep('sms');
    startPolling(session.orderId);
  };

  const handleConnect = async () => {
    setLoading(true);
    try {
      await api.post(`/wizard/${session.orderId}/connect`);
    } catch {}
    setLoading(false);
  };

  const handleCancel = async () => {
    if (session) await api.post(`/wizard/${session.orderId}/cancel`).catch(() => {});
    clearInterval(pollRef.current);
    onClose();
  };

  const stepIndex = (id) => STEPS.findIndex(s => s.id === id.replace('_prompt', ''));
  const currentIdx = STEPS.findIndex(s => step.startsWith(s.id));

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 520 }}>

        {/* Прогресс */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 28 }}>
          {STEPS.map((s, i) => (
            <div key={s.id} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', margin: '0 auto 4px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700,
                background: i < currentIdx ? 'var(--success)' : i === currentIdx ? 'var(--accent)' : 'var(--surface2)',
                color: i <= currentIdx ? '#fff' : 'var(--text-muted)',
                transition: 'all 0.3s',
              }}>
                {i < currentIdx ? '✓' : i + 1}
              </div>
              <div style={{ fontSize: 10, color: i === currentIdx ? 'var(--accent)' : 'var(--text-muted)' }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* ШАГ 1: Выбор страны */}
        {step === 'start' && (
          <>
            <h2>Купить номер на 5sim</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '8px 0 20px' }}>
              Система автоматически купит виртуальный номер. Тебе нужен будет телефон с WhatsApp чтобы ввести его.
            </p>
            <div className="form-group">
              <label>Страна номера</label>
              <select value={country} onChange={e => setCountry(e.target.value)}>
                {COUNTRIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            {error && <p className="error-msg">{error}</p>}
            <div className="modal-actions">
              <button className="btn-secondary" onClick={handleCancel}>Отмена</button>
              <button className="btn-primary" onClick={handleStart} disabled={loading}>
                {loading ? 'Покупаем номер...' : '→ Купить номер'}
              </button>
            </div>
          </>
        )}

        {/* ШАГ 2: Регистрация в WhatsApp */}
        {step === 'register' && session && (
          <>
            <h2>Открой WhatsApp на телефоне</h2>
            <div style={{ textAlign: 'center', margin: '16px 0' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 8 }}>Введи этот номер в WhatsApp:</div>
              <div style={{
                fontSize: 32, fontWeight: 800, letterSpacing: 4,
                fontFamily: 'monospace', color: 'var(--accent)',
                background: 'var(--surface2)', borderRadius: 10, padding: '12px 20px',
                userSelect: 'all',
              }}>
                +{session.phone}
              </div>
            </div>
            <div style={{
              background: 'var(--surface2)', borderRadius: 10, padding: 16,
              fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.8,
            }}>
              <div>1. Открой WhatsApp → Настройки → Связанные устройства</div>
              <div>2. Нажми «Привязать устройство»</div>
              <div>3. Выбери «Вход по номеру телефона»</div>
              <div>4. Введи номер выше</div>
              <div>5. WhatsApp отправит SMS — нажми кнопку ниже</div>
            </div>
            <div className="modal-actions" style={{ marginTop: 20 }}>
              <button className="btn-secondary" onClick={handleCancel}>Отмена</button>
              <button className="btn-primary" onClick={handleSmsSent}>
                ✓ Ввёл номер, жду SMS
              </button>
            </div>
          </>
        )}

        {/* ШАГ 3: Ожидание SMS */}
        {step === 'sms' && (
          <>
            <h2>Ожидаем SMS от WhatsApp</h2>
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div className="spinner" style={{ width: 48, height: 48, margin: '0 auto 16px' }} />
              <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                Система автоматически поймает код из SMS на 5sim...
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 8 }}>
                Обычно приходит за 10-30 секунд
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={handleCancel}>Отмена</button>
            </div>
          </>
        )}

        {/* ШАГ 3.5: SMS пришла — показываем код */}
        {step === 'pairing_prompt' && smsCode && (
          <>
            <h2>✓ SMS получена! Введи код</h2>
            <div style={{ textAlign: 'center', margin: '16px 0' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 8 }}>
                Введи этот код в WhatsApp:
              </div>
              <div style={{
                fontSize: 40, fontWeight: 800, letterSpacing: 8,
                fontFamily: 'monospace', color: 'var(--success)',
                background: 'var(--surface2)', borderRadius: 10, padding: '12px 20px',
                userSelect: 'all',
              }}>
                {smsCode}
              </div>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
              После ввода кода нажми кнопку ниже — система получит pairing code для финального подключения.
            </p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={handleCancel}>Отмена</button>
              <button className="btn-primary" onClick={async () => { setStep('sms'); await handleConnect(); }} disabled={loading}>
                {loading ? 'Подключаем...' : '→ Ввёл код, подключить'}
              </button>
            </div>
          </>
        )}

        {/* ШАГ 4: Pairing code */}
        {step === 'pairing' && pairingCode && (
          <>
            <h2>Финальный шаг — Pairing code</h2>
            <div style={{ textAlign: 'center', margin: '16px 0' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 8 }}>
                Введи этот код в WhatsApp:
              </div>
              <div style={{
                fontSize: 32, fontWeight: 800, letterSpacing: 6,
                fontFamily: 'monospace', color: 'var(--accent)',
                background: 'var(--surface2)', borderRadius: 10, padding: '12px 20px',
                userSelect: 'all',
              }}>
                {pairingCode}
              </div>
            </div>
            <div style={{
              background: 'var(--surface2)', borderRadius: 10, padding: 14,
              fontSize: 13, color: 'var(--text-muted)',
            }}>
              Настройки → Связанные устройства → Привязать → Введите номер телефона
            </div>
            <div className="modal-actions" style={{ marginTop: 20 }}>
              <button className="btn-secondary" onClick={handleCancel}>Отмена</button>
              <button className="btn-primary" onClick={() => { clearInterval(pollRef.current); onDone(); onClose(); }}>
                ✓ Готово
              </button>
            </div>
          </>
        )}

        {/* Ошибка */}
        {error && step !== 'start' && (
          <div style={{ marginTop: 16 }}>
            <p className="error-msg">{error}</p>
            <button className="btn-secondary" onClick={handleCancel}>Закрыть</button>
          </div>
        )}
      </div>
    </div>
  );
}
