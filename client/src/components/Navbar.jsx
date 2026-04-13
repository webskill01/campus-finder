import { User, LogOut } from 'lucide-react';
import { useAppState, useAppDispatch } from '../context/AppContext';

export default function Navbar() {
  const { user } = useAppState();
  const dispatch = useAppDispatch();

  function logout() {
    localStorage.removeItem('cf_token');
    dispatch({ type: 'SET_USER', payload: null });
    dispatch({ type: 'CLOSE_POPUP' });
  }

  function openProfile() {
    dispatch({ type: 'OPEN_POPUP', payload: { popup: 'profile' } });
  }

  const displayName = user?.name
    ? (user.name.length > 16 ? user.name.slice(0, 16) + '…' : user.name)
    : user?.rollNo || '';

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <img src="/logo.png" alt="CampusFinder" className="navbar-logo" />
      </div>
      <div className="navbar-right">
        {user ? (
          <>
            <button className="avatar-btn" onClick={openProfile} title="Edit profile">
              <User size={13} />
              <span className="avatar-roll">{displayName}</span>
            </button>
            <button className="btn-logout" onClick={logout} aria-label="Logout" title="Logout">
              <LogOut size={15} />
            </button>
          </>
        ) : (
          <button className="btn-login" onClick={() => dispatch({ type: 'OPEN_POPUP', payload: { popup: 'login' } })}>
            Login
          </button>
        )}
      </div>
    </nav>
  );
}
