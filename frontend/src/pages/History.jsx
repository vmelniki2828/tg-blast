import { useEffect, useState } from 'react';
import { getLogs, getCampaigns } from '../api/index.js';

export default function History() {
  const [logs, setLogs] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [filter, setFilter] = useState({ campaignId: '', status: '', channel: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCampaigns().then(r => setCampaigns(r.data));
  }, []);

  const load = async () => {
    setLoading(true);
    const params = {};
    if (filter.campaignId) params.campaignId = filter.campaignId;
    if (filter.status) params.status = filter.status;
    if (filter.channel) params.channel = filter.channel;
    const r = await getLogs(params);
    setLogs(r.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const set = (k, v) => setFilter(f => ({ ...f, [k]: v }));

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>История отправок</h1>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <select value={filter.campaignId} onChange={e => set('campaignId', e.target.value)} style={{ padding: '9px 12px', minWidth: 220 }}>
          <option value="">Все рассылки</option>
          {campaigns.map(c => <option key={c._id} value={c._id}>{c.title}</option>)}
        </select>
        <select value={filter.channel} onChange={e => set('channel', e.target.value)} style={{ padding: '9px 12px' }}>
          <option value="">Все каналы</option>
          <option value="telegram">📱 Telegram</option>
          <option value="whatsapp">💬 WhatsApp</option>
        </select>
        <select value={filter.status} onChange={e => set('status', e.target.value)} style={{ padding: '9px 12px' }}>
          <option value="">Любой статус</option>
          <option value="sent">Отправлено</option>
          <option value="failed">Ошибка</option>
        </select>
        <button className="btn-secondary" onClick={load} style={{ padding: '9px 16px' }}>↻ Обновить</button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" /></div>
        ) : logs.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📋</div>
            <p>Записей нет</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Контакт</th>
                <th>Канал</th>
                <th>Адресат</th>
                <th>Рассылка</th>
                <th>Статус</th>
                <th>Ошибка</th>
                <th>Время</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(l => (
                <tr key={l._id}>
                  <td style={{ fontWeight: 500 }}>{l.contact?.name || '—'}</td>
                  <td style={{ fontSize: 15 }}>
                    {l.channel === 'telegram' ? '📱' : '💬'}
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>{l.channel}</span>
                  </td>
                  <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: 12 }}>{l.chatId}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{l.campaign?.title || '—'}</td>
                  <td><span className={`badge badge-${l.status}`}>{l.status === 'sent' ? '✓ отправлено' : '✕ ошибка'}</span></td>
                  <td style={{ color: 'var(--danger)', fontSize: 12 }}>{l.error || '—'}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{new Date(l.sentAt).toLocaleString('ru')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 12 }}>
        Показывается последних 200 записей
      </div>
    </div>
  );
}
