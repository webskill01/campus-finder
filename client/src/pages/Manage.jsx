import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Calendar, Pencil, CheckCircle2, Trash2 } from 'lucide-react';
import { updateItem, resolveItem, deleteItem, getItemByManageToken } from '../api/api';
import { timeAgo } from '../hooks/useTimeAgo';

const LOCATIONS = ['library','canteen','block-a','block-b','block-c','parking','hostel','ground','admin-block','other'];

export default function Manage() {
  const { token } = useParams();
  const navigate   = useNavigate();
  const [item, setItem]     = useState(null);
  const [error, setError]   = useState('');
  const [mode, setMode]     = useState('view'); // 'view'|'edit'|'confirm-resolve'|'confirm-delete'
  const [form, setForm]     = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]       = useState('');

  useEffect(() => {
    getItemByManageToken(token)
      .then(fetched => {
        setItem(fetched);
        setForm({ title: fetched.title, description: fetched.description, location: fetched.location });
      })
      .catch(() => setError('Invalid or expired manage link.'));
  }, [token]);

  async function save() {
    setSaving(true);
    try {
      const updated = await updateItem(item._id, form, token);
      setItem(updated); setMode('view'); setMsg('Saved!');
    } catch (e) { setMsg(e.message); }
    finally { setSaving(false); }
  }

  async function resolve() {
    try {
      await resolveItem(item._id, token);
      setItem(i => ({ ...i, status: 'resolved' })); setMode('view'); setMsg('Marked as resolved ✓');
    } catch (e) { setMsg(e.message || 'Failed to resolve. Try again.'); }
  }

  async function remove() {
    try {
      await deleteItem(item._id, token);
      navigate('/');
    } catch (e) { setMsg(e.message || 'Failed to delete. Try again.'); setMode('view'); }
  }

  if (error) return (
    <div className="manage-page">
      <div className="error-card">
        <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Access denied</div>
        <div style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 16 }}>{error}</div>
        <a href="/" className="btn-primary" style={{ display: 'block', textAlign: 'center' }}>← Go home</a>
      </div>
    </div>
  );

  if (!item) return (
    <div className="manage-page flex-center" style={{ minHeight: '60vh' }}>
      <div className="spinner" />
    </div>
  );

  return (
    <div className="manage-page">
      <div className="manage-header">
        <div className="manage-title">Manage your post</div>
        <div className="text-dim" style={{ fontSize: 12 }}>
          Posted {timeAgo(item.createdAt)} · Status:{' '}
          <strong style={{ color: item.status === 'active' ? 'var(--green)' : 'var(--gray)' }}>{item.status}</strong>
        </div>
      </div>

      {msg && (
        <div style={{ background:'var(--green-lo)',border:'1px solid var(--green)',borderRadius:'var(--r-sm)',padding:'10px 14px',marginBottom:14,fontSize:13,color:'var(--green)' }}>
          {msg}
        </div>
      )}

      {item.image?.url && (
        <div style={{ borderRadius:'var(--r)',overflow:'hidden',border:'1.5px solid var(--line)',boxShadow:'var(--shadow-hard)',marginBottom:16 }}>
          <img src={item.image.url} alt={item.title} style={{ width:'100%',maxHeight:220,objectFit:'cover' }} />
        </div>
      )}

      {mode === 'view' && (
        <>
          <div style={{ marginBottom: 8 }}>
            <span className={`type-pill type-${item.type}`} style={{ position:'static',display:'inline-block' }}>{item.type}</span>
          </div>
          <div style={{ fontSize:16,fontWeight:700,marginBottom:8 }}>{item.title}</div>
          <div style={{ fontSize:13,color:'var(--text-dim)',marginBottom:12 }}>{item.description}</div>
          <div style={{ fontSize:12,color:'var(--gray)',display:'flex',alignItems:'center',gap:8,flexWrap:'wrap' }}>
            <span style={{display:'flex',alignItems:'center',gap:3}}><MapPin size={11}/>{item.location?.replace(/-/g,' ')}</span>
            <span style={{display:'flex',alignItems:'center',gap:3}}><Calendar size={11}/>{new Date(item.itemDate).toLocaleDateString()}</span>
          </div>
          {item.status === 'active' && (
            <div className="manage-actions">
              <button className="btn-secondary" style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6}} onClick={() => setMode('edit')}><Pencil size={13}/> Edit post</button>
              <button className="btn-secondary" style={{ borderColor:'var(--green)',color:'var(--green)',display:'flex',alignItems:'center',justifyContent:'center',gap:6 }} onClick={() => setMode('confirm-resolve')}><CheckCircle2 size={13}/> Mark as resolved</button>
              <button className="btn-danger" style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6}} onClick={() => setMode('confirm-delete')}><Trash2 size={13}/> Delete post</button>
            </div>
          )}
        </>
      )}

      {mode === 'edit' && (
        <>
          <div className="form-field"><label className="form-label">Title</label><input className="form-input" value={form.title} onChange={e => setForm(f=>({...f,title:e.target.value}))} /></div>
          <div className="form-field">
            <label className="form-label">Location</label>
            <select className="form-select form-input" value={form.location} onChange={e => setForm(f=>({...f,location:e.target.value}))}>
              {LOCATIONS.map(l => <option key={l} value={l}>{l.replace(/-/g,' ')}</option>)}
            </select>
          </div>
          <div className="form-field"><label className="form-label">Description</label><textarea className="form-textarea" value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))} /></div>
          <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
          <button className="btn-secondary" onClick={() => setMode('view')}>Cancel</button>
        </>
      )}

      {mode === 'confirm-resolve' && (
        <div style={{ textAlign:'center',padding:'20px 0' }}>
          <div style={{ marginBottom:12,display:'flex',justifyContent:'center' }}><CheckCircle2 size={40} style={{color:'var(--green)'}}/></div>
          <div style={{ fontWeight:700,marginBottom:8 }}>Mark as resolved?</div>
          <div style={{ fontSize:13,color:'var(--text-dim)',marginBottom:20 }}>This will remove it from active listings.</div>
          <button className="btn-primary" style={{ background:'var(--green)',borderColor:'var(--green)' }} onClick={resolve}>Yes, mark resolved</button>
          <button className="btn-secondary" onClick={() => setMode('view')}>Cancel</button>
        </div>
      )}

      {mode === 'confirm-delete' && (
        <div style={{ textAlign:'center',padding:'20px 0' }}>
          <div style={{ marginBottom:12,display:'flex',justifyContent:'center' }}><Trash2 size={40} style={{color:'var(--red)'}}/></div>
          <div style={{ fontWeight:700,marginBottom:8 }}>Delete this post?</div>
          <div style={{ fontSize:13,color:'var(--text-dim)',marginBottom:20 }}>This cannot be undone. The image will also be deleted.</div>
          <button className="btn-danger" onClick={remove}>Yes, delete permanently</button>
          <button className="btn-secondary" onClick={() => setMode('view')}>Cancel</button>
        </div>
      )}
    </div>
  );
}
