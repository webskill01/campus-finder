import { useState, useEffect } from 'react';
import { adminLogin, adminGetItems, adminDeleteItem, adminGetStats } from '../api/api';
import { timeAgo } from '../hooks/useTimeAgo';

export default function Admin() {
  const [authed, setAuthed] = useState(false);
  const [pass, setPass]     = useState('');
  const [items, setItems]   = useState([]);
  const [stats, setStats]   = useState(null);
  const [page, setPage]     = useState(1);
  const [total, setTotal]   = useState(0);
  const [error, setError]   = useState('');

  async function login(e) {
    e.preventDefault();
    try {
      await adminLogin(pass);
      setAuthed(true);
    } catch { setError('Wrong password'); }
  }

  async function del(id) {
    if (!window.confirm('Delete this item permanently?')) return;
    try {
      await adminDeleteItem(id);
      setItems(i => i.filter(x => x._id !== id));
    } catch { /* ignore */ }
  }

  useEffect(() => {
    if (!authed) return;
    adminGetItems({ page }).then(itemData => {
      setItems(itemData.items ?? []);
      setTotal(itemData.total ?? 0);
    }).catch((err) => {
      if (err.status === 401) { setAuthed(false); setError('Session expired. Please log in again.'); }
    });
    adminGetStats().then(setStats).catch(() => {});
  }, [page, authed]);

  if (!authed) return (
    <div style={{ maxWidth: 360, margin: '60px auto', padding: '0 16px' }}>
      <form onSubmit={login}>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>Admin Login</div>
        <div className="form-field">
          <label className="form-label">Password</label>
          <input className="form-input" type="password" value={pass} onChange={e => setPass(e.target.value)} autoFocus />
        </div>
        {error && <div className="text-red" style={{ fontSize: 12, marginBottom: 10 }}>{error}</div>}
        <button className="btn-primary" type="submit">Login →</button>
      </form>
    </div>
  );

  return (
    <div className="admin-page">
      <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>Admin Panel</div>

      {stats && (
        <div className="stats-bar">
          {[
            ['Active',   stats.active,   'var(--green)'],
            ['Resolved', stats.resolved, 'var(--accent)'],
            ['Expired',  stats.expired,  'var(--gray)'],
          ].map(([label, val, color]) => (
            <div key={label} className="stat-chip">
              <span className="stat-chip-num" style={{ color }}>{val}</span>
              <span className="stat-chip-label">{label}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table className="admin-table">
          <thead>
            <tr><th>Title</th><th>Type</th><th>Status</th><th>Category</th><th>Location</th><th>Posted</th><th></th></tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item._id}>
                <td style={{ maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{item.title}</td>
                <td><span className={`type-pill type-${item.type}`} style={{ position:'static',display:'inline-block' }}>{item.type}</span></td>
                <td style={{ fontSize:11,color:'var(--gray)',textTransform:'uppercase' }}>{item.status}</td>
                <td style={{ color:'var(--text-dim)' }}>{item.category}</td>
                <td style={{ color:'var(--text-dim)' }}>{item.location?.replace(/-/g,' ')}</td>
                <td style={{ color:'var(--gray)',fontSize:11 }}>{timeAgo(item.createdAt)}</td>
                <td>
                  <button onClick={() => del(item._id)} style={{ background:'var(--red-lo)',border:'1px solid var(--red)',color:'var(--red)',borderRadius:'var(--r-xs)',padding:'4px 10px',fontSize:11,fontWeight:600 }}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {Math.ceil(total / 20) > 1 && (
        <div className="pagination">
          <button className="page-btn arrow" onClick={() => setPage(p => p - 1)} disabled={page === 1}>‹</button>
          <button className="page-btn active">{page}</button>
          <button className="page-btn arrow" onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 20)}>›</button>
        </div>
      )}
    </div>
  );
}
