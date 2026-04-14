import { useState } from 'react';
import { updateProfile } from '../api/api';
import { useAppState, useAppDispatch } from '../context/AppContext';

const GMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export default function ProfilePopup({ onClose }) {
  const { user } = useAppState();
  const dispatch = useAppDispatch();
  const [form, setForm] = useState({
    name: user?.name || '',
    rollNo: user?.rollNo || '',
    gmail: user?.gmail || '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function set(k) { return e => setForm(f => ({ ...f, [k]: e.target.value })); }

  async function submit(e) {
    e.preventDefault();
    setError('');

    const cleanName = form.name.trim();
    if (!cleanName) { setError('Name is required'); return; }
    if (cleanName.length > 60) { setError('Name must be under 60 characters'); return; }

    const cleanRollNo = form.rollNo.trim();
    if (cleanRollNo.length < 2 || cleanRollNo.length > 20) {
      setError('Roll number must be 2–20 characters'); return;
    }

    if (!GMAIL_RE.test(form.gmail.trim())) {
      setError('Invalid email format'); return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('cf_token');
      const { token: newToken, gmail, rollNo, name } = await updateProfile(
        { name: cleanName, rollNo: cleanRollNo, gmail: form.gmail.trim().toLowerCase() },
        token
      );
      localStorage.setItem('cf_token', newToken);
      dispatch({ type: 'SET_USER', payload: { gmail, rollNo, name } });
      onClose();
    } catch (err) {
      setError(err.message || 'Update failed');
    } finally { setLoading(false); }
  }

  return (
    <form onSubmit={submit}>
      <div className="popup-title">Edit profile</div>
      <div className="popup-subtitle">Updates apply to all your posts immediately.</div>
      <div className="form-field" style={{ animationDelay: '0ms' }}>
        <label className="form-label">Full Name</label>
        <input className="form-input" type="text" value={form.name} onChange={set('name')}
          maxLength={60} required />
      </div>
      <div className="form-field" style={{ animationDelay: '40ms' }}>
        <label className="form-label">Roll Number</label>
        <input className="form-input" value={form.rollNo} onChange={set('rollNo')} required />
      </div>
      <div className="form-field" style={{ animationDelay: '80ms' }}>
        <label className="form-label">College Gmail</label>
        <input className="form-input" type="email" value={form.gmail} onChange={set('gmail')} required />
      </div>
      {error && <div className="text-red" style={{ fontSize: 12, marginBottom: 10 }}>{error}</div>}
      <button className="btn-primary" type="submit" disabled={loading}>
        {loading ? 'Saving…' : 'Save'}
      </button>
    </form>
  );
}
