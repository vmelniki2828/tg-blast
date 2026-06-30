import { useEffect, useState } from 'react';
import { getCampaigns, createCampaign, cancelCampaign, getContacts } from '../api/index.js';

function CampaignModal({ contacts, onSave, onClose }) {
  const [form, setForm] = useState({
    title: '',
    text: '',
    channel: 'telegram',
    recipients: 'all',
    selectedContacts: [],
    scheduledAt: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleContact = (id) => {
    setForm(f => ({
      ...f,
      selectedContacts: f.selectedContacts.includes(id)
        ? f.selectedContacts.filter(c => c !== id)
        : [...f.selectedContacts, id],
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.title.trim() || !form.text.trim()) return setError('Заполните название и текст');
    if (form.recipients === 'selected' && form.selectedContacts.length === 0) {
      return setError('Выберите хотя бы одного получателя');
    }
    setLoading(true);
    try {
      await onSave({
        title: form.title,
        text: form.text,
        channel: form.channel,
        recipients: form.recipients === 'all' ? 'all' : form.selectedContacts,
        scheduledAt: form.scheduledAt || undefined,
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 560 }}>
        <h2>Новая рассылка</h2>
        <form onSubmit={submit}>
          <div className="form-group">
            <label>Название рассылки *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} required placeholder="Акция июля" />
          </div>
          <div className="form-group">
            <label>Канал отправки</label>
            <select value={form.channel} onChange={e => set('channel', e.target.value)}>
              <option value="telegram">📱 Только Telegram</option>
              <option value="whatsapp">💬 Только WhatsApp</option>
              <option value="both">📱+💬 Telegram + WhatsApp</option>
            </select>
          </div>
          <div className="form-group">
            <label>Текст сообщения *{form.channel === 'telegram' ? ' (поддерживается HTML)' : ''}</label>
            <textarea value={form.text} onChange={e => set('text', e.target.value)} required placeholder={form.channel !== 'whatsapp' ? '<b>Привет!</b> Это наша рассылка...' : 'Привет! Это наша рассылка...'} />
          </div>
          <div className="form-group">
            <label>Получатели</label>
            <select value={form.recipients} onChange={e => set('recipients', e.target.value)}>
              <option value="all">Все активные контакты</option>
              <option value="selected">Выбрать вручную</option>
            </select>
          </div>
          {form.recipients === 'selected' && (
            <div className="form-group">
              <label>Выберите контакты ({form.selectedContacts.length} выбрано)</label>
              <div style={{
                maxHeight: 180, overflowY: 'auto',
                background: 'var(--surface2)', borderRadius: 8,
                border: '1px solid var(--border)', padding: 8,
              }}>
                {contacts.map(c => (
                  <label key={c._id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 4px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form.selectedContacts.includes(c._id)}
                      onChange={() => toggleContact(c._id)}
                      style={{ width: 'auto' }}
                    />
                    <span>{c.name}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{c.chatId}</span>
                  </label>
                ))}
                {contacts.length === 0 && <p style={{ color: 'var(--text-muted)', padding: 8 }}>Нет контактов</p>}
              </div>
            </div>
          )}
          <div className="form-group">
            <label>Отложить до (оставьте пустым — отправить сейчас)</label>
            <input
              type="datetime-local"
              value={form.scheduledAt}
              onChange={e => set('scheduledAt', e.target.value)}
            />
          </div>
          {error && <p className="error-msg">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Отмена</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Создание...' : form.scheduledAt ? '🕐 Запланировать' : '🚀 Отправить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [modal, setModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [c, co] = await Promise.all([getCampaigns(), getContacts({ active: true })]);
    setCampaigns(c.data);
    setContacts(co.data);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 5000); // автообновление статусов
    return () => clearInterval(t);
  }, []);

  const handleSave = async (data) => {
    await createCampaign(data);
    load();
  };

  const handleCancel = async (id) => {
    if (!confirm('Отменить рассылку?')) return;
    await cancelCampaign(id);
    load();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Рассылки</h1>
        <button className="btn-primary" onClick={() => setModal(true)}>+ Новая рассылка</button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" /></div>
        ) : campaigns.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📭</div>
            <p>Рассылок ещё нет</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Название</th>
                <th>Канал</th>
                <th>Статус</th>
                <th>Всего</th>
                <th>Отправлено</th>
                <th>Ошибок</th>
                <th>Запланировано</th>
                <th>Создано</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map(c => (
                <tr key={c._id}>
                  <td style={{ fontWeight: 500, maxWidth: 160 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{c.text}</div>
                  </td>
                  <td style={{ fontSize: 15 }}>
                    {c.channel === 'telegram' && '📱'}
                    {c.channel === 'whatsapp' && '💬'}
                    {c.channel === 'both' && '📱+💬'}
                  </td>
                  <td>
                    <span className={`badge badge-${c.status}`}>
                      {c.status === 'sending' && <><span className="spinner" style={{ width: 10, height: 10, marginRight: 5 }} /></>}
                      {c.status}
                    </span>
                  </td>
                  <td>{c.stats?.total ?? 0}</td>
                  <td style={{ color: 'var(--success)' }}>{c.stats?.sent ?? 0}</td>
                  <td style={{ color: 'var(--danger)' }}>{c.stats?.failed ?? 0}</td>
                  <td style={{ color: 'var(--text-muted)' }}>
                    {c.scheduledAt ? new Date(c.scheduledAt).toLocaleString('ru') : '—'}
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{new Date(c.createdAt).toLocaleString('ru')}</td>
                  <td>
                    {c.status === 'pending' && (
                      <button className="btn-danger btn-sm" onClick={() => handleCancel(c._id)}>Отмена</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <CampaignModal contacts={contacts} onSave={handleSave} onClose={() => setModal(false)} />
      )}
    </div>
  );
}
