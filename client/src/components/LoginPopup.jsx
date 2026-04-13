import { useState } from 'react';
import { authVerify } from '../api/api';
import { useAppDispatch } from '../context/AppContext';

function dobError(dob) {
  if (!dob) return 'Date of birth is required';
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return 'Invalid date of birth';
  if (birth > new Date()) return 'Date of birth cannot be in the future';
  const age = (Date.now() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  if (age < 14) return 'You must be at least 14 years old to use CampusFinder';
  return null;
}

const today = new Date().toISOString().split('T')[0];

export default function LoginPopup() {
  const dispatch = useAppDispatch();
  const [form, setForm] = useState({ name: '', gmail: '', rollNo: '', dob: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function set(k) { return e => setForm(f => ({ ...f, [k]: e.target.value })); }

  async function submit(e) {
    e.preventDefault();
    setError('');

    const dobErr = dobError(form.dob);
    if (dobErr) { setError(dobErr); return; }

    if (!form.name.trim()) { setError('Name is required'); return; }

    setLoading(true);
    try {
      const { token, gmail, rollNo, name } = await authVerify(form);
      localStorage.setItem('cf_token', token);
      dispatch({ type: 'SET_USER', payload: { gmail, rollNo, name } });
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
        <label className="form-label">Full Name</label>
        <input className="form-input" type="text" placeholder="Your full name" value={form.name}
          onChange={set('name')} maxLength={60} required />
      </div>
      <div className="form-field" style={{ animationDelay: '40ms' }}>
        <label className="form-label">College Gmail</label>
        <input className="form-input" type="email" placeholder="student@college.edu" value={form.gmail}
          onChange={set('gmail')} required />
      </div>
      <div className="form-field" style={{ animationDelay: '80ms' }}>
        <label className="form-label">Roll Number</label>
        <input className="form-input" placeholder="e.g. 22CS101" value={form.rollNo}
          onChange={set('rollNo')} required />
      </div>
      <div className="form-field" style={{ animationDelay: '120ms' }}>
        <label className="form-label">Date of Birth</label>
        <input className="form-input" type="date" value={form.dob} max={today}
          onChange={set('dob')} required />
      </div>
      {error && <div className="text-red" style={{ fontSize: 12, marginBottom: 10 }}>{error}</div>}
      <button className="btn-primary" type="submit" disabled={loading}>
        {loading ? 'Verifying…' : 'Continue →'}
      </button>
    </form>
  );
}
