import { useState } from 'react';
import { CheckCircle2, Target, Check, Loader2, HelpCircle } from 'lucide-react';
import { postItem, getItem } from '../api/api';
import { useAppDispatch } from '../context/AppContext';
import Upload from './Upload';

const CATEGORIES = ['phone','keys','bag','documents','electronics','accessories','clothing','wallet','bottle','glasses','headphones','id-card','stationery','other'];
const LOCATION_SUGGESTIONS = ['Library','Canteen','Block A','Block B','Block C','Parking','Hostel','Ground','Admin Block','Main Gate','Sports Complex','Auditorium'];

export default function PostPopup({ onClose }) {
  const dispatch = useAppDispatch();
  const [type, setType] = useState('found');
  const [form, setForm] = useState({ title: '', category: 'phone', location: '', description: '', itemDate: new Date().toISOString().split('T')[0] });
  const [upload, setUpload] = useState(null);
  const [state, setState] = useState('form');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [postMeta, setPostMeta] = useState(null);

  function set(k) {
    return e => setForm(f => ({ ...f, [k]: e.target.value }));
  }

  async function submit(e) {
    e.preventDefault();

    const selectedDate = new Date(form.itemDate);
    const now = new Date();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    if (selectedDate > todayEnd) {
      setError('Item date cannot be in the future.');
      return;
    }
    if (selectedDate < sevenDaysAgo) {
      setError('Item date cannot be more than 7 days in the past.');
      return;
    }

    setError('');
    setState('submitting');

    try {
      const token = localStorage.getItem('cf_token');
      const fd = new FormData();
      fd.append('type', type);
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (upload?.file) fd.append('image', upload.file);
      if (upload?.dominantColor) fd.append('dominantColor', upload.dominantColor);

      const response = await postItem(fd, token);
      const createdItem = response?.item;

      setPostMeta({
        mailSent: response?.mailSent !== false,
        mailError: response?.mailError || '',
        manageUrl: response?.manageUrl || '',
      });
      dispatch({ type: 'REFRESH_ITEMS' });

      setState('done');

      let polls = 0;
      const poll = async () => {
        polls += 1;
        const fresh = createdItem?._id
          ? await getItem(createdItem._id).catch(() => null)
          : null;

        if (fresh?.enriched || polls >= 3) {
          setResult(fresh);
          return;
        }

        setTimeout(poll, 3000);
      };

      setTimeout(poll, 3000);
    } catch (err) {
      setError(err.message || 'Failed to post');
      setState('form');
    }
  }

  if (state === 'submitting') {
    return (
      <div className="post-result">
        <Loader2 size={36} className="spin" style={{ color: 'var(--accent)', marginBottom: 8 }} />
        <div className="post-result-sub">Posting item...</div>
      </div>
    );
  }

  if (state === 'done') {
    return (
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
            ? (postMeta?.mailSent ? 'Check your Gmail for the manage link to view matches.' : 'Use the manage link below to view your post and matches.')
            : (postMeta?.mailSent ? "No matches yet - you'll be notified if someone matches." : 'No matches yet. Email delivery failed, so keep the manage link below.')}
        </div>
        {!postMeta?.mailSent && postMeta?.manageUrl && (
          <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5, wordBreak: 'break-word' }}>
            Manage link: <a href={postMeta.manageUrl} target="_blank" rel="noreferrer">{postMeta.manageUrl}</a>
            {postMeta?.mailError ? <div style={{ marginTop: 6 }}>Mail error: {postMeta.mailError}</div> : null}
          </div>
        )}
        <button className="btn-primary" style={{ marginTop: 20 }} onClick={onClose}>Done</button>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <div className="popup-title">Report an item</div>
      <div className="popup-subtitle">Fill in what you know - AI will enrich it automatically.</div>
      <div className="type-toggle">
        <button type="button" className={`toggle-btn toggle-found${type === 'found' ? ' active' : ''}`} onClick={() => setType('found')}><Check size={13} strokeWidth={2.5} /> Found Something</button>
        <button type="button" className={`toggle-btn toggle-lost${type === 'lost' ? ' active' : ''}`} onClick={() => setType('lost')}><HelpCircle size={13} strokeWidth={2.5} /> Lost Something</button>
      </div>
      <div className="form-row">
        <div className="form-field">
          <label className="form-label">Category</label>
          <select className="form-select form-input" value={form.category} onChange={set('category')}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/-/g, ' ')}</option>)}
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
          placeholder="e.g. Near library, Block B corridor..."
          value={form.location}
          onChange={set('location')}
          required
        />
        <datalist id="location-suggestions">
          {LOCATION_SUGGESTIONS.map(l => <option key={l} value={l} />)}
        </datalist>
      </div>
      <div className="form-field"><label className="form-label">Title</label><input className="form-input" placeholder="e.g. Black Sony headphones" value={form.title} onChange={set('title')} required /></div>
      <div className="form-field"><label className="form-label">Description</label><textarea className="form-textarea" placeholder="Describe the item in detail - colour, brand, distinguishing marks..." value={form.description} onChange={set('description')} required /></div>
      <Upload onResult={setUpload} />
      {error && <div className="text-red" style={{ fontSize: 12, marginTop: 10, marginBottom: 4 }}>{error}</div>}
      <button className="btn-primary" style={{ marginTop: 16 }} type="submit">Post Item -&gt;</button>
    </form>
  );
}
