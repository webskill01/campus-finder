import { Plus } from 'lucide-react';
import { useAppState, useAppDispatch } from '../context/AppContext';

export default function FAB() {
  const { user } = useAppState();
  const dispatch = useAppDispatch();

  function handleClick() {
    if (!user) { dispatch({ type: 'OPEN_POPUP', payload: { popup: 'login' } }); return; }
    dispatch({ type: 'OPEN_POPUP', payload: { popup: 'post' } });
  }

  return (
    <div
      className="fab-wrap"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label="Post Item"
      onKeyDown={e => e.key === 'Enter' && handleClick()}
    >
      <div className="fab-btn">
        <Plus size={22} strokeWidth={2.5} />
      </div>
    </div>
  );
}
