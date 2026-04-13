import { ChevronRight } from 'lucide-react';
import { useAppDispatch } from '../context/AppContext';
import { getItem } from '../api/api';

export default function MatchCard({ match, onMatchClick, style }) {
  const dispatch = useAppDispatch();

  async function open() {
    if (onMatchClick) { onMatchClick(match); return; }
    const id = match.itemId?._id || match.itemId;
    const item = await getItem(id).catch(() => null);
    if (item) dispatch({ type: 'SET_ACTIVE_ITEM', payload: item });
  }

  return (
    <div className="match-card" style={style} onClick={open} role="button" tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && open()}>
      <div className="match-info">
        <div className="match-title">{match.title || 'View item'}</div>
        <div className="match-sub">
          {match.category || ''}
          {match.category && match.location ? ' · ' : ''}
          {match.location ? match.location.replace(/-/g, ' ') : ''}
        </div>
      </div>
      <ChevronRight size={14} className="icon-sm" />
    </div>
  );
}
