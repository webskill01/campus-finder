import { useAppState, useAppDispatch } from '../context/AppContext';

const SORT_OPTIONS = [{ id:'recent',label:'Recent' },{ id:'old',label:'Oldest' },{ id:'az',label:'A–Z' },{ id:'match',label:'Best Match' }];
const DATE_OPTIONS = [{ id:'all',label:'All Time' },{ id:'week',label:'This Week' },{ id:'today',label:'Today' }];

export default function FilterPanel({ onClose, exiting = false, hover = false, onPanelEnter, onPanelLeave }) {
  const { sort, dateRange } = useAppState();
  const dispatch = useAppDispatch();
  return (
    <>
      {!hover && <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:199 }} />}
      <div
        className={`filter-panel${exiting ? ' exiting' : ''}`}
        onMouseEnter={hover ? onPanelEnter : undefined}
        onMouseLeave={hover ? onPanelLeave : undefined}
      >
        <div className="filter-panel-title">Filter & Sort</div>
        <div className="filter-group">
          <span className="filter-group-label">Sort by</span>
          <div className="filter-options">
            {SORT_OPTIONS.map(o => (
              <button key={o.id} className={`filter-option${sort===o.id?' active':''}`}
                onClick={() => dispatch({ type:'SET_SORT', payload:o.id })}>{o.label}</button>
            ))}
          </div>
        </div>
        <div className="filter-group">
          <span className="filter-group-label">Date</span>
          <div className="filter-options">
            {DATE_OPTIONS.map(o => (
              <button key={o.id} className={`filter-option${dateRange===o.id?' active':''}`}
                onClick={() => dispatch({ type:'SET_DATE_RANGE', payload:o.id })}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
