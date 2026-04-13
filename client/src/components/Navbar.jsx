import { MapPin, User } from 'lucide-react';
import { useAppState, useAppDispatch } from '../context/AppContext';

export default function Navbar() {
  const { user } = useAppState();
  const dispatch = useAppDispatch();
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <div className="brand-dot">
          <MapPin size={14} strokeWidth={2.5} />
        </div>
        Campus<em>Finder</em>
      </div>
      <div className="navbar-right">
        {user ? (
          <div className="avatar" title={user.gmail}>
            <User size={13} />
            <span className="avatar-roll">{user.rollNo}</span>
          </div>
        ) : (
          <button className="btn-login" onClick={() => dispatch({ type: 'OPEN_POPUP', payload: { popup: 'login' } })}>
            Login
          </button>
        )}
      </div>
    </nav>
  );
}
