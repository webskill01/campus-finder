import { ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAppState, useAppDispatch } from '../context/AppContext';

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'phone', label: 'Phone' },
  { id: 'keys', label: 'Keys' },
  { id: 'bag', label: 'Bag' },
  { id: 'documents', label: 'Docs' },
  { id: 'electronics', label: 'Electronics' },
  { id: 'accessories', label: 'Accessories' },
  { id: 'clothing', label: 'Clothing' },
  { id: 'wallet', label: 'Wallet' },
  { id: 'bottle', label: 'Bottle' },
  { id: 'glasses', label: 'Glasses' },
  { id: 'headphones', label: 'Headphones' },
  { id: 'id-card', label: 'ID Card' },
  { id: 'stationery', label: 'Stationery' },
  { id: 'other', label: 'Other' },
];

const desktop = () => window.innerWidth >= 768;

export default function CategoryButton() {
  const { category } = useAppState();
  const dispatch = useAppDispatch();
  const [open, setOpen] = useState(false);
  const [exiting, setExiting] = useState(false);
  const closeTimer = useRef(null);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  const activeLabel = CATEGORIES.find(c => c.id === category)?.label || 'All';
  const isFiltered = category !== 'all';

  function openPanel() {
    clearTimeout(closeTimer.current);
    if (!open) { setExiting(false); setOpen(true); }
  }
  function closePanel() {
    setExiting(true);
    setTimeout(() => { setOpen(false); setExiting(false); }, 155);
  }
  function scheduleClose() {
    closeTimer.current = setTimeout(closePanel, 80);
  }
  function cancelClose() { clearTimeout(closeTimer.current); }

  function select(id) {
    dispatch({ type: 'SET_CATEGORY', payload: id });
    closePanel();
  }

  return (
    <div className="cat-section">
      <button
        className={`cat-btn${isFiltered ? ' active' : ''}`}
        onClick={() => { if (!desktop()) open ? closePanel() : openPanel(); }}
        onMouseEnter={() => desktop() && openPanel()}
        onMouseLeave={() => desktop() && scheduleClose()}
        aria-label="Category filter"
      >
        {activeLabel} <ChevronDown size={12} />
      </button>
      {open && !desktop() && <div onClick={closePanel} style={{ position: 'fixed', inset: 0, zIndex: 199 }} />}
      {open && (
        <div
          className={`cat-panel${exiting ? ' exiting' : ''}`}
          onMouseEnter={() => desktop() && cancelClose()}
          onMouseLeave={() => desktop() && scheduleClose()}
        >
          {CATEGORIES.map(c => (
            <button
              key={c.id}
              className={`cat-option${category === c.id ? ' active' : ''}`}
              onClick={() => select(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
