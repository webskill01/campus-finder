import { useState } from 'react';
import { MessageCircle, Mail } from 'lucide-react';
import { expressInterest } from '../api/api';
import { useAppState } from '../context/AppContext';

export default function InterestPopup({ item, onClose }) {
  const { user } = useAppState();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);
  const [error, setError]     = useState('');

  async function submit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const token = localStorage.getItem('cf_token');
      await expressInterest(item._id, { message }, token);
      setDone(true);
    } catch (err) {
      setError(err.message || 'Failed to send');
    } finally { setLoading(false); }
  }

  if (done) return (
    <div className="post-result">
      <div className="post-result-icon"><Mail size={44} style={{ color: 'var(--green)' }} /></div>
      <div className="post-result-title">Message sent!</div>
      <div className="post-result-sub">The poster will be notified with your contact.</div>
      <button className="btn-primary" style={{ marginTop: 20 }} onClick={onClose}>Done</button>
    </div>
  );

  return (
    <form onSubmit={submit}>
      <div className="popup-title" style={{ display:'flex', alignItems:'center', gap:8 }}><MessageCircle size={18} style={{ color:'var(--accent)' }} />Express interest</div>
      <div className="popup-subtitle">Your contact details go directly to the poster.</div>
      <div className="form-field">
        <label className="form-label">Your message (optional)</label>
        <textarea className="form-textarea" placeholder="e.g. I think this is mine — it has a red sticker on the back…" value={message} onChange={e => setMessage(e.target.value)} />
      </div>
      <div className="contact-card">
        <div className="contact-card-label">Sharing your contact</div>
        <div className="contact-card-email">{user?.gmail}</div>
        <div className="contact-card-roll">Roll No. {user?.rollNo}</div>
      </div>
      {error && <div className="text-red" style={{ fontSize: 12, marginBottom: 10 }}>{error}</div>}
      <button className="btn-primary" type="submit" disabled={loading}>{loading ? 'Sending…' : 'Send'}</button>
      <button className="btn-secondary" type="button" onClick={onClose}>Cancel</button>
    </form>
  );
}
