import { useState } from 'react';
import { checkEmail, authVerify } from '../api/api';
import { useAppDispatch } from '../context/AppContext';

function dobError(dob) {
  if (!dob) return 'Date of birth is required';
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return 'Invalid date of birth';
  if (birth > new Date()) return "Date of birth can't be in the future";
  const age = (Date.now() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  if (age < 14) return 'Must be at least 14 years old';
  return null;
}

const emailChipStyle = {
  background: 'var(--surface2)',
  border: '1.5px solid var(--line)',
  padding: '8px 12px',
  borderRadius: 'var(--r-sm)',
  fontSize: 13,
  color: 'var(--accent)',
  marginBottom: 14,
};

const backBtnStyle = {
  background: 'none',
  border: 'none',
  color: 'var(--gray)',
  fontSize: 13,
  cursor: 'pointer',
  padding: '0 0 12px 0',
  display: 'block',
};

export default function LoginPopup() {
  const dispatch = useAppDispatch();
  const [step, setStep] = useState('email'); // 'email' | 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function goBack() {
    setError('');
    setRollNo('');
    setName('');
    setDob('');
    setStep('email');
  }

  async function handleEmailSubmit(e) {
    e.preventDefault();
    setError('');

    const trimmed = email.trim();
    if (!trimmed) { setError('Email is required'); return; }
    // Basic email format validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const lower = trimmed.toLowerCase();
      setEmail(lower);
      const { exists } = await checkEmail(lower);
      setStep(exists ? 'login' : 'signup');
    } catch (err) {
      setError(err.message || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleLoginSubmit(e) {
    e.preventDefault();
    setError('');

    if (!rollNo.trim()) { setError('Roll number is required'); return; }

    setLoading(true);
    try {
      const { token, gmail, rollNo: rn, name: n } = await authVerify({ gmail: email, rollNo: rollNo.trim() });
      localStorage.setItem('cf_token', token);
      dispatch({ type: 'SET_USER', payload: { gmail, rollNo: rn, name: n } });
      dispatch({ type: 'CLOSE_POPUP' });
    } catch (err) {
      if (err.status === 401) {
        setError("Roll number doesn't match");
      } else {
        setError(err.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSignupSubmit(e) {
    e.preventDefault();
    setError('');

    const trimmedRoll = rollNo.trim();
    if (!trimmedRoll || trimmedRoll.length < 2 || trimmedRoll.length > 20) {
      setError('Roll number must be 2–20 characters');
      return;
    }
    if (!name.trim()) { setError('Full name is required'); return; }
    const dobErr = dobError(dob);
    if (dobErr) { setError(dobErr); return; }

    setLoading(true);
    try {
      const { token, gmail, rollNo: rn, name: n } = await authVerify({
        gmail: email,
        rollNo: trimmedRoll,
        name: name.trim(),
        dob,
      });
      localStorage.setItem('cf_token', token);
      dispatch({ type: 'SET_USER', payload: { gmail, rollNo: rn, name: n } });
      dispatch({ type: 'CLOSE_POPUP' });
    } catch (err) {
      setError(err.message || 'Sign up failed');
    } finally {
      setLoading(false);
    }
  }

  if (step === 'email') {
    return (
      <form onSubmit={handleEmailSubmit}>
        <div className="popup-title">Sign in to Find Hub</div>
        <div className="popup-subtitle">Enter your college email</div>
        <div className="form-field" style={{ animationDelay: '0ms' }}>
          <label className="form-label">College Email</label>
          <input
            className="form-input"
            type="email"
            placeholder="student@college.edu"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoFocus
            required
          />
        </div>
        {error && <div className="text-red" style={{ fontSize: 12, marginBottom: 10 }}>{error}</div>}
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? 'Checking…' : 'Continue'}
        </button>
      </form>
    );
  }

  if (step === 'login') {
    return (
      <form onSubmit={handleLoginSubmit}>
        <button type="button" style={backBtnStyle} onClick={goBack}>← Back</button>
        <div className="popup-title">Welcome back!</div>
        <div className="popup-subtitle">Enter your roll number</div>
        <div className="email-chip" style={emailChipStyle}>{email}</div>
        <div className="form-field" style={{ animationDelay: '0ms' }}>
          <label className="form-label">Roll Number</label>
          <input
            className="form-input"
            placeholder="e.g. 22CS101"
            value={rollNo}
            onChange={e => setRollNo(e.target.value)}
            autoFocus
            required
          />
        </div>
        {error && <div className="text-red" style={{ fontSize: 12, marginBottom: 10 }}>{error}</div>}
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? 'Verifying…' : 'Sign in'}
        </button>
      </form>
    );
  }

  // step === 'signup'
  return (
    <form onSubmit={handleSignupSubmit}>
      <button type="button" style={backBtnStyle} onClick={goBack}>← Back</button>
      <div className="popup-title">Create account</div>
      <div className="popup-subtitle">Just a few details to get started</div>
      <div className="email-chip" style={emailChipStyle}>{email}</div>
      <div className="form-field" style={{ animationDelay: '0ms' }}>
        <label className="form-label">Roll Number</label>
        <input
          className="form-input"
          placeholder="e.g. 22CS101"
          value={rollNo}
          onChange={e => setRollNo(e.target.value)}
          autoFocus
          required
        />
      </div>
      <div className="form-field" style={{ animationDelay: '40ms' }}>
        <label className="form-label">Full Name</label>
        <input
          className="form-input"
          type="text"
          placeholder="Your full name"
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={60}
          required
        />
      </div>
      <div className="form-field" style={{ animationDelay: '80ms' }}>
        <label className="form-label">Date of Birth</label>
        <input
          className="form-input"
          type="date"
          value={dob}
          max={new Date().toISOString().split('T')[0]}
          onChange={e => setDob(e.target.value)}
          required
        />
      </div>
      {error && <div className="text-red" style={{ fontSize: 12, marginBottom: 10 }}>{error}</div>}
      <button className="btn-primary" type="submit" disabled={loading}>
        {loading ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  );
}
