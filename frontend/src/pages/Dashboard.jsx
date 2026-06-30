import { useEffect, useState } from 'react';
import { getCampaigns, getContacts } from '../api/index.js';
import { Link } from 'react-router-dom';

function StatCard({ label, value, color }) {
  return (
    <div className="card" style={{ flex: 1 }}>
      <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 700, color: color || 'var(--text)' }}>{value ?? '—'}</div>
    </div>
  );
}

export default function Dashboard() {
  const [campaigns, setCampaigns] = useState([]);
  const [contacts, setContacts] = useState([]);

  useEffect(() => {
    getCampaigns().then(r => setCampaigns(r.data));
    getContacts().then(r => setContacts(r.data));
  }, []);

  const total = campaigns.length;
  const done = campaigns.filter(c => c.status === 'done').length;
  const pending = campaigns.filter(c => c.status === 'pending').length;
  const totalSent = campaigns.reduce((acc, c) => acc + (c.stats?.sent || 0), 0);

  const recent = [...campaigns].slice(0, 5);

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Дашборд</h1>

      <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
        <StatCard label="Контактов" value={contacts.length} color="var(--accent)" />
        <StatCard label="Рассылок" value={total} />
        <StatCard label="Выполнено" value={done} color="var(--success)" />
        <StatCard label="Ожидает" value={pending} color="var(--warning)" />
        <StatCard label="Сообщений отправлено" value={totalSent} color="var(--accent)" />
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>Последние рассылки</h2>
          <Link to="/campaigns" style={{ color: 'var(--accent)', fontSize: 13 }}>Все →</Link>
        </div>

        {recent.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📭</div>
            <p>Рассылок ещё нет</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Название</th>
                <th>Статус</th>
                <th>Отправлено</th>
                <th>Ошибок</th>
                <th>Дата</th>
              </tr>
            </thead>
            <tbody>
              {recent.map(c => (
                <tr key={c._id}>
                  <td style={{ fontWeight: 500 }}>{c.title}</td>
                  <td><span className={`badge badge-${c.status}`}>{c.status}</span></td>
                  <td style={{ color: 'var(--success)' }}>{c.stats?.sent ?? 0}</td>
                  <td style={{ color: 'var(--danger)' }}>{c.stats?.failed ?? 0}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{new Date(c.createdAt).toLocaleString('ru')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
