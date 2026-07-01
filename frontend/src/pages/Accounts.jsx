import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import AccountWizard from '../components/AccountWizard.jsx';

const api = axios.create({ baseURL: '/api' });

const STATUS_COLOR = {
  ready:        'var(--success)',
  connecting:   'var(--warning)',
  disconnected: 'var(--danger)',
  banned:       'var(--danger)',
};

const STATUS_LABEL = {
  ready:        '✓ Готов',
  connecting:   '⏳ Подключение',
  disconnected: '✗ Отключён',
  banned:       '🚫 Заблокирован',
};

const add5sim = (data) => axios.create({ baseURL: '/api' }).post('/accounts/add-5sim', data);

const COUNTRIES = [
  { value: 'any',     label: '🌍 Любая страна' },
  { value: 'russia',  label: '🇷🇺 Россия' },
  { value: 'ukraine', label: '🇺🇦 Украина' },
  { value: 'kazakhstan', label: '🇰🇿 Казахстан' },
  { value: 'indonesia',  label: '🇮🇩 Индонезия' },
  { value: 'india',      label: '🇮🇳 Индия' },
];

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [health, setHealth] = useState(null);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null); // null | 'manual' | 'auto' | 'fivesim' | 'wizard'
  const [form, setForm] = useState({ phone: '', label: '', country: 'any', count: 1, orderId: '' });
  const [error, setError] = useState('');
  const [pairingCode, setPairingCode] = useState(null);
  const pollRef = useRef(null);

  const load = async () => {
    try {
      const r = await api.get('/accounts');
      setAccounts(r.data);
    } catch {}
  };

  const checkHealth = async () => {
    try {
      const r = await api.get('/accounts/health');
      setHealth(r.data.ok);
    } catch {
      setHealth(false);
    }
  };

  const checkBalance = async () => {
    try {
      const r = await api.get('/accounts/balance');
      if (r.data.ok) setBalance(r.data.balance);
    } catch {}
  };

  useEffect(() => {
    load();
    checkHealth();
    checkBalance();
    pollRef.current = setInterval(load, 5000);
    return () => clearInterval(pollRef.current);
  }, []);

  const handleAddManual = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setPairingCode(null);
    try {
      const r = await api.post('/accounts/add-manual', { phone: form.phone, label: form.label });
      if (r.data.pairingCode) setPairingCode(r.data.pairingCode);
      load();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd5sim = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/accounts/add-5sim', {
        phone: form.phone,
        orderId: form.orderId,
        label: form.label,
      });
      setModal(null);
      setForm(f => ({ ...f, phone: '', orderId: '', label: '' }));
      load();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAuto = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const count = Number(form.count) || 1;
      for (let i = 0; i < count; i++) {
        await api.post('/accounts/add-auto', { country: form.country });
        await new Promise(r => setTimeout(r, 2000));
      }
      load();
      setModal(null);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить аккаунт?')) return;
    await api.delete(`/accounts/${id}`).catch(() => {});
    load();
  };

  const handleLogout = async (id) => {
    await api.post(`/accounts/${id}/logout`).catch(() => {});
    load();
  };

  const ready = accounts.filter(a => a.status === 'ready').length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>WA Аккаунты</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-secondary" onClick={() => setModal('manual')}>+ Свой номер (WA)</button>
          <button className="btn-primary" onClick={() => setModal('wizard')}>🧙 Добавить через 5sim</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: 1, minWidth: 160 }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Режим</div>
          <div style={{ color: 'var(--success)', fontWeight: 600 }}>✓ Локальный (без Docker)</div>
        </div>
        <div className="card" style={{ flex: 1, minWidth: 160 }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Готовых аккаунтов</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--success)' }}>{ready} / {accounts.length}</div>
        </div>
        <div className="card" style={{ flex: 1, minWidth: 160 }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Баланс 5sim</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)' }}>
            {balance !== null ? `$${Number(balance).toFixed(2)}` : '—'}
          </div>
        </div>
        <div className="card" style={{ flex: 1, minWidth: 160 }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Отправлено сегодня</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>
            {accounts.reduce((s, a) => s + (a.sentToday || 0), 0)}
          </div>
        </div>
      </div>

      {/* Таблица аккаунтов */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {accounts.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📱</div>
            <p>Нет аккаунтов. Добавьте первый!</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Номер</th>
                <th>Статус</th>
                <th>Сегодня</th>
                <th>Всего</th>
                <th>Последняя отправка</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {accounts.map(a => (
                <tr key={a._id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{a.label}</div>
                    {a.pairingCode && (
                      <div style={{
                        display: 'inline-block', marginTop: 4,
                        fontFamily: 'monospace', fontSize: 15, fontWeight: 700,
                        letterSpacing: 3, color: 'var(--accent)',
                        background: 'var(--surface2)', borderRadius: 6, padding: '2px 8px',
                      }}>
                        {a.pairingCode}
                      </div>
                    )}
                    {a.error && <div style={{ color: 'var(--danger)', fontSize: 11, marginTop: 2 }}>{a.error}</div>}
                  </td>
                  <td>
                    <span style={{
                      color: STATUS_COLOR[a.status] || 'var(--text-muted)',
                      fontWeight: 500, fontSize: 13,
                    }}>
                      {a.status === 'connecting' && <span className="spinner" style={{ width: 10, height: 10, marginRight: 5 }} />}
                      {STATUS_LABEL[a.status] || a.status}
                    </span>
                  </td>
                  <td>{a.sentToday || 0}</td>
                  <td>{a.sentTotal || 0}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                    {a.lastUsed ? new Date(a.lastUsed).toLocaleString('ru') : '—'}
                  </td>
                  <td style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    {a.status === 'ready' && (
                      <button className="btn-secondary btn-sm" onClick={() => handleLogout(a._id)}>Выйти</button>
                    )}
                    <button className="btn-danger btn-sm" onClick={() => handleDelete(a._id)}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      {modal === 'manual' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <h2>Добавить аккаунт вручную</h2>
            <form onSubmit={handleAddManual}>
              <div className="form-group">
                <label>Номер телефона (с кодом страны)</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="79001234567" required />
              </div>
              <div className="form-group">
                <label>Метка (необязательно)</label>
                <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="Аккаунт 1" />
              </div>
              {pairingCode && (
                <div style={{ textAlign: 'center', margin: '16px 0', padding: 16, background: 'var(--surface2)', borderRadius: 10 }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 8 }}>Введите этот код в WhatsApp:</div>
                  <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: 6, color: 'var(--accent)', fontFamily: 'monospace' }}>
                    {pairingCode}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 8 }}>
                    Настройки → Связанные устройства → Привязать → Введите номер телефона
                  </div>
                </div>
              )}
              {error && <p className="error-msg">{error}</p>}
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => { setModal(null); setPairingCode(null); }}>Закрыть</button>
                <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Подключение...' : 'Получить код'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal === 'fivesim' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <h2>🎯 Купил номер на 5sim</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
              Введи номер и Order ID из <a href="https://5sim.net/orders" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>5sim.net/orders</a>. Система сама получит pairing code, дождётся SMS от WhatsApp и активирует аккаунт.
            </p>
            <form onSubmit={handleAdd5sim}>
              <div className="form-group">
                <label>Номер телефона (с кодом страны)</label>
                <input
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="79001234567"
                  required
                />
              </div>
              <div className="form-group">
                <label>Order ID с 5sim</label>
                <input
                  value={form.orderId}
                  onChange={e => setForm(f => ({ ...f, orderId: e.target.value }))}
                  placeholder="123456789"
                  required
                />
                <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
                  Открой 5sim.net → Мои заказы → скопируй ID заказа
                </div>
              </div>
              <div className="form-group">
                <label>Метка (необязательно)</label>
                <input
                  value={form.label}
                  onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                  placeholder="Аккаунт 1"
                />
              </div>
              {error && <p className="error-msg">{error}</p>}
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Отмена</button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Запуск...' : '🚀 Активировать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal === 'auto' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <h2>⚡ Авто-добавление через 5sim</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
              Система автоматически купит номер на 5sim, получит SMS и подключит аккаунт.
            </p>
            <form onSubmit={handleAddAuto}>
              <div className="form-group">
                <label>Страна номера</label>
                <select value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))}>
                  {COUNTRIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Количество аккаунтов</label>
                <input
                  type="number" min="1" max="50"
                  value={form.count}
                  onChange={e => setForm(f => ({ ...f, count: e.target.value }))}
                />
              </div>
              {balance !== null && (
                <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 8 }}>
                  Баланс 5sim: <strong style={{ color: 'var(--accent)' }}>${Number(balance).toFixed(2)}</strong>
                </div>
              )}
              {error && <p className="error-msg">{error}</p>}
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Отмена</button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Запуск...' : `⚡ Добавить ${form.count} аккаунт(а)`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal === 'wizard' && (
        <AccountWizard
          onClose={() => setModal(null)}
          onDone={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
