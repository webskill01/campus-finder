import { CircleCheck, HelpCircle } from 'lucide-react';
import { useAppState, useAppDispatch } from '../context/AppContext';

export default function TabBar({ foundCount, lostCount }) {
  const { tab } = useAppState();
  const dispatch = useAppDispatch();
  return (
    <div className="tab-bar">
      <div className="tab-row">
        {[
          { id:'found', label:'Found Items', icon:<CircleCheck size={14}/>, count:foundCount },
          { id:'lost',  label:'Lost Items',  icon:<HelpCircle size={14}/>,  count:lostCount  },
        ].map(t => (
          <button key={t.id} data-tab={t.id} className={`tab${tab===t.id?' active':''}`}
            onClick={() => dispatch({ type:'SET_TAB', payload:t.id })}>
            {t.icon}{t.label}
            {t.count != null && <span className="tab-badge">{t.count}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
