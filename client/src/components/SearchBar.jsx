import { Search } from 'lucide-react';
import { useAppState, useAppDispatch } from '../context/AppContext';

const NL_WORDS = ['near','at the','in the','yesterday','last week','today','i lost','i found','on monday','on tuesday','on wednesday','on thursday','on friday'];

export function isAI(q) {
  return q.split(' ').length > 5 || NL_WORDS.some(w => q.toLowerCase().includes(w));
}

export default function SearchBar() {
  const { query } = useAppState();
  const dispatch = useAppDispatch();
  function handleChange(e) {
    const q = e.target.value;
    dispatch({ type: 'SET_QUERY', payload: { query: q, aiMode: isAI(q) } });
  }
  const aiActive = query.length > 0 && isAI(query);
  return (
    <div className="search-wrap">
      <div className="search-outer">
        <Search size={16} className="icon-sm" />
        <input className="search-input" type="text" placeholder="Search items or describe naturally…"
          value={query} onChange={handleChange} aria-label="Search items" />
        {query.length > 0 && (
          <div className={`ai-pill${aiActive ? ' ai-active' : ''}`}>
            <span className="ai-pulse" />AI
          </div>
        )}
      </div>
    </div>
  );
}
