import { Plus } from 'lucide-react';
import { useAppState, useAppDispatch } from '../context/AppContext';
import { useScrollDirection } from '../hooks/useScrollDirection';

export default function FAB() {
  const { user } = useAppState();
  const dispatch = useAppDispatch();
  const scrollDir = useScrollDirection();
  const collapsed = scrollDir === 'down';
  function handleClick() {
    if (!user) { dispatch({ type:'OPEN_POPUP', payload:{ popup:'login' } }); return; }
    dispatch({ type:'OPEN_POPUP', payload:{ popup:'post' } });
  }
  return (
    <div className={`fab-wrap${collapsed ? ' fab-collapsed' : ''}`} onClick={handleClick} role="button" tabIndex={0}
      aria-label="Post Item" onKeyDown={e => e.key==='Enter' && handleClick()}>
      <div className={`fab-label${collapsed?' collapsed':''}`}>Post Item</div>
      <div className="fab-btn">
        <Plus size={20} strokeWidth={2.5} className="fab-plus-icon" />
      </div>
    </div>
  );
}
