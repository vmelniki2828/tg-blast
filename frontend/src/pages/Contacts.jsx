import { useEffect, useState } from 'react';
import { getContacts, createContact, updateContact, deleteContact } from '../api/index.js';

const emptyForm = { name: '', chatId: '', username: '', phone: '', tags: '', notes: '', active: true };

function ContactModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = { ...form, tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [] };
      await onSave(data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2>{initial ? 'Редактировать контакт' : 'Новый контакт'}</h2>
        <form onSubmit={submit}>
          <div className="form-row">
            <div className="form-group">
              <label>Имя *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Telegram Chat ID</label>
              <input value={form.chatId} onChange={e => set('chatId', e.target.value)} placeholder="123456789" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>WhatsApp номер</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="79001234567" />
            </div>
            <div className="form-group">
              <label>Username</label>
              <input value={form.username} onChange={e => set('username', e.target.value)} placeholder="@username" />
            </div>
          </div>
          <div className="form-group">
            <label>Теги (через запятую)</label>
            <input value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="vip, клиент" />
          </div>
          <div className="form-group">
            <label>Заметки</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} style={{ minHeight: 70 }} />
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" id="active" checked={form.active} onChange={e => set('active', e.target.checked)} style={{ width: 'auto' }} />
            <label htmlFor="active" style={{ textTransform: 'none', letterSpacing: 0 }}>Активен (включить в рассылки)</label>
          </div>
          {error && <p className="error-msg">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Отмена</button>
            <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Сохранение...' : 'Сохранить'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // null | 'new' | contact object
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const r = await getContacts(search ? { search } : {});
    setContacts(r.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [search]);

  const handleSave = async (data) => {
    if (modal && modal._id) {
      await updateContact(modal._id, data);
    } else {
      await createContact(data);
    }
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить контакт?')) return;
    await deleteContact(id);
    load();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Контакты</h1>
        <button className="btn-primary" onClick={() => setModal('new')}>+ Добавить</button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Поиск по имени, username, chatId..."
          style={{ width: 320, padding: '9px 14px' }}
        />
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" /></div>
        ) : contacts.length === 0 ? (
          <div className="empty-state">
            <div className="icon">👥</div>
            <p>Контактов нет. Добавьте первый!</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Имя</th>
                <th>TG Chat ID</th>
                <th>WA Телефон</th>
                <th>Теги</th>
                <th>Статус</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {contacts.map(c => (
                <tr key={c._id}>
                  <td style={{ fontWeight: 500 }}>{c.name}</td>
                  <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: 12 }}>
                    {c.chatId ? <span title="Telegram">📱 {c.chatId}</span> : <span style={{ opacity: 0.4 }}>—</span>}
                  </td>
                  <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: 12 }}>
                    {c.phone ? <span title="WhatsApp">💬 {c.phone}</span> : <span style={{ opacity: 0.4 }}>—</span>}
                  </td>
                  <td>
                    {c.tags?.map(t => <span key={t} className="tag" style={{ marginRight: 4 }}>{t}</span>)}
                  </td>
                  <td>
                    <span className={`badge`} style={{
                      background: c.active ? 'rgba(52,201,132,0.1)' : 'rgba(123,130,160,0.1)',
                      color: c.active ? 'var(--success)' : 'var(--text-muted)',
                    }}>
                      {c.active ? 'Активен' : 'Неактивен'}
                    </span>
                  </td>
                  <td style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button className="btn-secondary btn-sm" onClick={() => setModal(c)}>✏</button>
                    <button className="btn-danger btn-sm" onClick={() => handleDelete(c._id)}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <ContactModal
          initial={modal === 'new' ? null : { ...modal, tags: modal.tags?.join(', ') || '' }}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
