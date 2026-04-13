import { SlidersHorizontal, Smartphone, Key, Briefcase, FileText, Laptop, Watch, Shirt, Package, Wallet, GlassWater, Glasses, Headphones, CreditCard, PenLine } from 'lucide-react';
import { useState, useRef } from 'react';
import { useAppState, useAppDispatch } from '../context/AppContext';
import FilterPanel from './FilterPanel';

const CATEGORIES = [
  { id: 'all',         label: 'All',         icon: null },
  { id: 'phone',       label: 'Phone',       icon: <Smartphone size={12} /> },
  { id: 'keys',        label: 'Keys',        icon: <Key size={12} /> },
  { id: 'bag',         label: 'Bag',         icon: <Briefcase size={12} /> },
  { id: 'documents',   label: 'Docs',        icon: <FileText size={12} /> },
  { id: 'electronics', label: 'Electronics', icon: <Laptop size={12} /> },
  { id: 'accessories', label: 'Accessories', icon: <Watch size={12} /> },
  { id: 'clothing',    label: 'Clothing',    icon: <Shirt size={12} /> },
  { id: 'wallet',      label: 'Wallet',      icon: <Wallet size={12} /> },
  { id: 'bottle',      label: 'Bottle',      icon: <GlassWater size={12} /> },
  { id: 'glasses',     label: 'Glasses',     icon: <Glasses size={12} /> },
  { id: 'headphones',  label: 'Headphones',  icon: <Headphones size={12} /> },
  { id: 'id-card',     label: 'ID Card',     icon: <CreditCard size={12} /> },
  { id: 'stationery',  label: 'Stationery',  icon: <PenLine size={12} /> },
  { id: 'other',       label: 'Other',       icon: <Package size={12} /> },
];

const desktop = () => window.innerWidth >= 768;

export default function ChipRow() {
  const { category, sort, dateRange } = useAppState();
  const dispatch = useAppDispatch();
  const [showFilter, setShowFilter] = useState(false);
  const [exiting, setExiting] = useState(false);
  const closeTimer = useRef(null);
  const hasFilters = sort !== 'recent' || dateRange !== 'all';

  function open() {
    clearTimeout(closeTimer.current);
    if (!showFilter) { setExiting(false); setShowFilter(true); }
  }
  function close() {
    setExiting(true);
    setTimeout(() => { setShowFilter(false); setExiting(false); }, 155);
  }
  function scheduleClose() {
    closeTimer.current = setTimeout(close, 80);
  }
  function cancelClose() {
    clearTimeout(closeTimer.current);
  }

  return (
    <div className="chip-section">
      <div className="chip-row-wrap">
        <div className="chip-row">
          {CATEGORIES.map(c => (
            <button key={c.id} className={`chip${category === c.id ? ' active' : ''}`}
              onClick={() => dispatch({ type: 'SET_CATEGORY', payload: c.id })}>
              {c.icon}
              {c.label}
            </button>
          ))}
        </div>
        <button
          className={`filter-btn${hasFilters ? ' has-filters' : ''}`}
          onClick={() => { if (!desktop()) showFilter ? close() : open(); }}
          onMouseEnter={() => desktop() && open()}
          onMouseLeave={() => desktop() && scheduleClose()}
          aria-label="Filters"
        >
          <SlidersHorizontal size={12} />
          Filter
          {hasFilters && <span className="filter-count">!</span>}
        </button>
      </div>
      {showFilter && (
        <FilterPanel
          onClose={close}
          exiting={exiting}
          hover={desktop()}
          onPanelEnter={cancelClose}
          onPanelLeave={scheduleClose}
        />
      )}
    </div>
  );
}
