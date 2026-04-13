import { useEffect, useState, useCallback } from 'react';
import { Search } from 'lucide-react';
import { getItems, searchItems } from '../api/api';
import { useAppState, useAppDispatch } from '../context/AppContext';
import { useDebounce } from '../hooks/useDebounce';
import { isAI } from '../components/SearchBar';
import SearchBar from '../components/SearchBar';
import ChipRow from '../components/ChipRow';
import TabBar from '../components/TabBar';
import ItemCard from '../components/ItemCard';
import ResolvedStrip from '../components/ResolvedStrip';
import FAB from '../components/FAB';

function usePageSize() {
  const get = () => window.innerWidth >= 1024 ? 20 : 12;
  const [size, setSize] = useState(get);
  useEffect(() => {
    const h = () => setSize(get());
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return size;
}

export default function Home() {
  const { tab, page, category, sort, dateRange, query } = useAppState();
  const dispatch = useAppDispatch();
  const [items, setItems]     = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(false);
  const debouncedQ = useDebounce(query, isAI(query) ? 800 : 300);
  const pageSize = usePageSize();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let data;
      if (debouncedQ) {
        data = await searchItems(debouncedQ, isAI(debouncedQ), tab);
        setItems(Array.isArray(data) ? data : data.items ?? []);
        setTotal(Array.isArray(data) ? data.length : data.total ?? 0);
      } else {
        data = await getItems({ type: tab, category: category === 'all' ? undefined : category, sort, dateRange, page, limit: pageSize, status: 'active' });
        setItems(data.items ?? []);
        setTotal(data.total ?? 0);
      }
    } catch { setItems([]); setTotal(0); }
    finally { setLoading(false); }
  }, [tab, page, category, sort, dateRange, debouncedQ, pageSize]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <SearchBar />
      <ChipRow />
      <TabBar
        foundCount={tab === 'found' ? total : undefined}
        lostCount={tab === 'lost' ? total : undefined}
      />

      <div className="items-section">
        <div key={`meta-${tab}`} className="section-meta tab-content">
          <strong>{total} {tab} item{total !== 1 ? 's' : ''}</strong>
          <span>
            {dateRange === 'today' ? 'Today' : dateRange === 'week' ? 'This week' : 'All time'} · Campus-wide
          </span>
        </div>

        {loading && (
          <div className="items-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton">
                <div className="skeleton-img" />
                <div className="skeleton-body">
                  <div className="skeleton-line" style={{ width: '42%', height: 9, marginBottom: 6 }} />
                  <div className="skeleton-line" style={{ marginBottom: 5 }} />
                  <div className="skeleton-line short" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && items.length === 0 && (
          <div key={`empty-${tab}`} className="empty-state tab-content">
            <div className="empty-state-icon"><Search size={36} /></div>
            <div className="empty-state-text">No {tab} items found</div>
          </div>
        )}

        {!loading && items.length > 0 && (
          <div key={`grid-${tab}`} className="items-grid tab-content">
            {items.map(item => <ItemCard key={item._id} item={item} />)}
          </div>
        )}

        {totalPages > 1 && (
          <div className="pagination">
            <button className="page-btn arrow"
              onClick={() => dispatch({ type: 'SET_PAGE', payload: page - 1 })}
              disabled={page === 1}>‹</button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const p = totalPages <= 5 ? i + 1 : Math.max(1, page - 2) + i;
              return p <= totalPages ? (
                <button key={p} className={`page-btn${page === p ? ' active' : ''}`}
                  onClick={() => dispatch({ type: 'SET_PAGE', payload: p })}>{p}</button>
              ) : null;
            })}
            <button className="page-btn arrow"
              onClick={() => dispatch({ type: 'SET_PAGE', payload: page + 1 })}
              disabled={page >= totalPages}>›</button>
          </div>
        )}

        <ResolvedStrip />
      </div>

      <FAB />
    </div>
  );
}
