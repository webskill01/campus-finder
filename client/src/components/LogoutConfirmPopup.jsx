import { LogOut } from 'lucide-react';
import { useAppDispatch } from '../context/AppContext';

export default function LogoutConfirmPopup({ onClose }) {
  const dispatch = useAppDispatch();

  function handleLogout() {
    localStorage.removeItem('cf_token');
    dispatch({ type: 'SET_USER', payload: null });
    dispatch({ type: 'CLOSE_POPUP' });
  }

  return (
    <div className="confirm-popup">
      <div className="confirm-icon danger">
        <LogOut size={20} />
      </div>
      <div className="popup-title">Log out?</div>
      <div className="popup-subtitle">You will need to log in again to post, report, or contact a poster.</div>
      <button className="btn-danger" type="button" onClick={handleLogout}>Log out</button>
      <button className="btn-secondary" type="button" onClick={onClose}>Cancel</button>
    </div>
  );
}
