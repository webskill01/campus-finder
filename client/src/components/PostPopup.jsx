import { useState } from 'react';
import { CheckCircle2, Target, Check, Loader2, HelpCircle } from 'lucide-react';
import { postItem, getItem } from '../api/api';
import { useAppState } from '../context/AppContext';
import Upload from './Upload';

const CATEGORIES = ['phone','keys','bag','documents','electronics','accessories','clothing','wallet','bottle','glasses','headphones','id-card','stationery','other'];
const LOCATION_SUGGESTIONS = ['Library','Canteen','Block A','Block B','Block C','Parking','Hostel','Ground','Admin Block','Main Gate','Sports Complex','Auditorium'];

export default function PostPopup({ onClose }) {
  const { user } = useAppState();
  const [type, setType]     = useState('found');
  const [form, setForm]     = useState({ title:'', category:'phone', location:'', description:'', itemDate: new Date().toISOString().split('T')[0] });
  const [upload, setUpload] = useState(null);
  const [state, setState]   = useState('form'); // 'form'|'submitting'|'scanning'|'done'
  const [result, setResult] = useState(null);
  const [error, setError]   = useState('');

  function set(k) { return e => setForm(f => ({ ...f, [k]: e.target.value })); }

  async function submit(e) {
    e.preventDefault();
    setState('submitting');
    try {
      const token = localStorage.getItem('cf_token');
      const fd = new FormData();
      fd.append('type', type);
      Object.entries(form).forEach(([k,v]) => fd.append(k, v));
      if (upload?.file) fd.append('image', upload.file);
      if (upload?.dominantColor) fd.append('dominantColor', upload.dominantColor);

      const item = await postItem(fd, token);
      setState('scanning');

      let polls = 0;
      const poll = async () => {
        polls++;
        const fresh = await getItem(item._id).catch(() => null);
        if (fresh?.enriched || polls >= 3) { setResult(fresh); setState('done'); }
        else setTimeout(poll, 3000);
      };
      setTimeout(poll, 3000);
    } catch (err) {
      setError(err.message || 'Failed to post');
      setState('form');
    }
  }

  if (state === 'submitting') return (
    <div className="post-result">
      <Loader2 size={36} className="spin" style={{ color: 'var(--accent)', marginBottom: 8 }} />
      <div className="post-result-sub">Posting item…</div>
    </div>
  );

  if (state === 'scanning') return (
    <div className="post-result">
      <div className="post-result-icon"><CheckCircle2 size={44} style={{ color: 'var(--green)' }} /></div>
      <div className="post-result-title">Item posted!</div>
      <div className="post-result-sub">Manage link sent to your Gmail.</div>
      <div style={{ marginTop: 16, display:'flex', alignItems:'center', gap:8, color:'var(--text-dim)', fontSize:13 }}>
        <span className="scanning-dot" />Scanning for matches…
      </div>
    </div>
  );

  if (state === 'done') return (
    <div className="post-result">
      <div className="post-result-icon">
        {result?.topMatches?.length
          ? <Target size={44} style={{ color: 'var(--accent)' }} />
          : <CheckCircle2 size={44} style={{ color: 'var(--green)' }} />}
      </div>
      <div className="post-result-title">
        {result?.topMatches?.length
          ? `${result.topMatches.length} possible match${result.topMatches.length > 1 ? 'es' : ''} found!`
          : 'Posted successfully'}
      </div>
      <div className="post-result-sub">
        {result?.topMatches?.length
          ? "Check your Gmail for the manage link to view matches."
          : "No matches yet — you'll be notified if someone matches."}
      </div>
      <button className="btn-primary" style={{ marginTop: 20 }} onClick={onClose}>Done</button>
    </div>
  );

  return (
    <form onSubmit={submit}>
      <div className="popup-title">Report an item</div>
      <div className="popup-subtitle">Fill in what you know — AI will enrich it automatically.</div>
      <div className="type-toggle">
        <button type="button" className={`toggle-btn toggle-found${type==='found'?' active':''}`} onClick={() => setType('found')}><Check size={13} strokeWidth={2.5} /> Found Something</button>
        <button type="button" className={`toggle-btn toggle-lost${type==='lost'?' active':''}`}  onClick={() => setType('lost')}><HelpCircle size={13} strokeWidth={2.5} /> Lost Something</button>
      </div>
      <div className="form-row">
        <div className="form-field">
          <label className="form-label">Category</label>
          <select className="form-select form-input" value={form.category} onChange={set('category')}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/-/g,' ')}</option>)}
          </select>
        </div>
        <div className="form-field">
          <label className="form-label">Date</label>
          <input className="form-input" type="date" value={form.itemDate} onChange={set('itemDate')} required />
        </div>
      </div>
      <div className="form-field">
        <label className="form-label">Location</label>
        <input
          className="form-input"
          list="location-suggestions"
          placeholder="e.g. Near library, Block B corridor…"
          value={form.location}
          onChange={set('location')}
          required
        />
        <datalist id="location-suggestions">
          {LOCATION_SUGGESTIONS.map(l => <option key={l} value={l} />)}
        </datalist>
      </div>
      <div className="form-field"><label className="form-label">Title</label><input className="form-input" placeholder="e.g. Black Sony headphones" value={form.title} onChange={set('title')} required /></div>
      <div className="form-field"><label className="form-label">Description</label><textarea className="form-textarea" placeholder="Describe the item in detail — colour, brand, distinguishing marks…" value={form.description} onChange={set('description')} required /></div>
      <Upload onResult={setUpload} />
      {error && <div className="text-red" style={{ fontSize: 12, marginTop: 10, marginBottom: 4 }}>{error}</div>}
      <button className="btn-primary" style={{ marginTop: 16 }} type="submit">Post Item →</button>
    </form>
  );
}
