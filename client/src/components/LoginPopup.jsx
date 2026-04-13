import { useState } from 'react';
import { authVerify } from '../api/api';
import { useAppDispatch } from '../context/AppContext';

export default function LoginPopup() {
  const dispatch = useAppDispatch();
  const [form, setForm] = useState({ gmail: '', rollNo: '', dob: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function set(k) { return e => setForm(f => ({ ...f, [k]: e.target.value })); }

  async function submit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { token, gmail, rollNo } = await authVerify(form);
      localStorage.setItem('cf_token', token);
      dispatch({ type: 'SET_USER', payload: { gmail, rollNo } });
      dispatch({ type: 'CLOSE_POPUP' });
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally { setLoading(false); }
  }

  return (
    <form onSubmit={submit}>
      <div className="popup-title">Welcome to CampusFinder</div>
      <div className="popup-subtitle">Sign in or create your account — new users are registered automatically.</div>
      <div className="form-field" style={{ animationDelay: '0ms' }}>
        <label className="form-label">College Gmail</label>
        <input className="form-input" type="email" placeholder="student@college.edu" value={form.gmail} onChange={set('gmail')} required />
      </div>
      <div className="form-field" style={{ animationDelay: '60ms' }}>
        <label className="form-label">Roll Number</label>
        <input className="form-input" placeholder="e.g. 22CS101" value={form.rollNo} onChange={set('rollNo')} required />
      </div>
      <div className="form-field" style={{ animationDelay: '120ms' }}>
        <label className="form-label">Date of Birth</label>
        <input className="form-input" type="date" value={form.dob} onChange={set('dob')} required />
      </div>
      {error && <div className="text-red" style={{ fontSize: 12, marginBottom: 10 }}>{error}</div>}
      <button className="btn-primary" type="submit" disabled={loading}>
        {loading ? 'Verifying…' : 'Continue →'}
      </button>
    </form>
  );
}
