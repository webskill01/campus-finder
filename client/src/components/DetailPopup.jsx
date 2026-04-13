import { useState, useEffect, useRef } from 'react';
import { X, ArrowLeft, MapPin, Clock, Mail, Smartphone, Key, Briefcase, FileText, Laptop, Watch, Shirt, Package, Wallet, GlassWater, Glasses, Headphones, CreditCard, PenLine } from 'lucide-react';
import { useAppState, useAppDispatch } from '../context/AppContext';
import MatchCard from './MatchCard';
import { getItem } from '../api/api';
import { timeAgo } from '../hooks/useTimeAgo';

const CAT_ICONS = {
  phone:       <Smartphone size={22} />,
  keys:        <Key size={22} />,
  bag:         <Briefcase size={22} />,
  documents:   <FileText size={22} />,
  electronics: <Laptop size={22} />,
  accessories: <Watch size={22} />,
  clothing:    <Shirt size={22} />,
  wallet:      <Wallet size={22} />,
  bottle:      <GlassWater size={22} />,
  glasses:     <Glasses size={22} />,
  headphones:  <Headphones size={22} />,
  'id-card':   <CreditCard size={22} />,
  stationery:  <PenLine size={22} />,
  other:       <Package size={22} />,
};
const CAT_LABELS = {
  phone:'Phone', keys:'Keys', bag:'Bag', documents:'Documents',
  electronics:'Electronics', accessories:'Accessories', clothing:'Clothing',
  wallet:'Wallet', bottle:'Bottle', glasses:'Glasses', headphones:'Headphones',
  'id-card':'ID Card', stationery:'Stationery', other:'Other',
};
const CAT_ICONS_LG = {
  phone:       <Smartphone size={44} />,
  keys:        <Key size={44} />,
  bag:         <Briefcase size={44} />,
  documents:   <FileText size={44} />,
  electronics: <Laptop size={44} />,
  accessories: <Watch size={44} />,
  clothing:    <Shirt size={44} />,
  wallet:      <Wallet size={44} />,
  bottle:      <GlassWater size={44} />,
  glasses:     <Glasses size={44} />,
  headphones:  <Headphones size={44} />,
  'id-card':   <CreditCard size={44} />,
  stationery:  <PenLine size={44} />,
  other:       <Package size={44} />,
};

export default function DetailPopup({ item, onClose }) {
  const { user } = useAppState();
  const dispatch  = useAppDispatch();
  const [lightbox, setLightbox] = useState(false);
  const [currentItem, setCurrentItem] = useState(item);
  const [history, setHistory] = useState([]);
  // Cache fetched match item data keyed by itemId so MatchCard renders instantly
  const [matchCache, setMatchCache] = useState({});
  const fetchedRef = useRef(new Set());

  // Pre-fetch match item data for any topMatches missing title (old DB records)
  useEffect(() => {
    const pending = (currentItem.topMatches || []).filter(
      m => m.score > 40 && !m.title && !fetchedRef.current.has(m.itemId)
    );
    if (!pending.length) return;
    pending.forEach(m => {
      fetchedRef.current.add(m.itemId);
      getItem(m.itemId).then(fetched => {
        if (fetched) setMatchCache(c => ({
          ...c,
          [m.itemId]: { title: fetched.title, category: fetched.category, location: fetched.location }
        }));
      }).catch(() => {});
    });
  }, [currentItem]);

  if (!currentItem) return null;

  const matches = (currentItem.topMatches || []).filter(m => m.score > 40);
  const desc = currentItem.enriched?.cleanDescription || currentItem.description;
  const tags = [...(currentItem.enriched?.keywords || []), currentItem.enriched?.color, currentItem.enriched?.brand].filter(Boolean);
  const catIcon    = CAT_ICONS[currentItem.category]    ?? <Package size={22} />;
  const catIconLg  = CAT_ICONS_LG[currentItem.category] ?? <Package size={44} />;
  const catLabel   = CAT_LABELS[currentItem.category]   ?? 'Other';

  function onInterest() {
    if (!user) { dispatch({ type: 'OPEN_POPUP', payload: { popup: 'login' } }); return; }
    dispatch({ type: 'OPEN_POPUP', payload: { popup: 'interest', activeItem: currentItem } });
  }

  async function handleMatchClick(match) {
    const next = await getItem(match.itemId).catch(() => null);
    if (!next) return;
    setHistory(h => [...h, currentItem]);
    setCurrentItem(next);
    setLightbox(false);
  }

  function handleBack() {
    setCurrentItem(history[history.length - 1]);
    setHistory(h => h.slice(0, -1));
    setLightbox(false);
  }

  return (
    <>
      {/* Close button: floats over the full popup (top-right on both mobile & desktop) */}
      <button className="detail-close" onClick={onClose} aria-label="Close">
        <X size={14} />
      </button>

      <div className="detail-grid">
        {/* ── Image column ── */}
        <div className="detail-img-col">
          <div className={`detail-img-area${currentItem.image?.url ? ' clickable' : ''}`}
            onClick={() => currentItem.image?.url && setLightbox(true)}>
            {currentItem.image?.url
              ? <img src={currentItem.image.url} alt={currentItem.title} />
              : <span className="detail-no-img">{catIconLg}</span>
            }
          </div>
          {currentItem.dominantColor && (
            <div className="detail-color-bar" style={{
              background: `linear-gradient(to top, ${currentItem.dominantColor}55, transparent)`
            }} />
          )}
        </div>

        {/* ── Content column ── */}
        <div className="detail-content-col">
          {/* Back button (shows when navigated into a match) */}
          {history.length > 0 && (
            <button className="detail-back" onClick={handleBack}>
              <ArrowLeft size={13} /> Back
            </button>
          )}

          {/* Type + Location + Time */}
          <div className="detail-meta-row">
            <span className={`type-pill type-${currentItem.type}`} style={{ position:'static' }}>
              {currentItem.type === 'found' ? 'Found' : 'Lost'}
            </span>
            {currentItem.location && (
              <span className="detail-meta-loc">
                <MapPin size={11} />{currentItem.location.replace(/-/g,' ')}
              </span>
            )}
            <span className="detail-meta-time">
              <Clock size={11} />{timeAgo(currentItem.createdAt)}
            </span>
          </div>

          {/* Category */}
          <div className="detail-cat-row">
            <span className="detail-cat-icon">{catIcon}</span>
            <span className="detail-cat-label">{catLabel}</span>
          </div>

          {/* Title */}
          <h2 className="detail-title">{currentItem.title}</h2>

          {/* Description */}
          {desc && <p className="detail-desc">{desc}</p>}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="detail-tags">
              {tags.map((t, i) => <span key={i} className="tag">{t}</span>)}
            </div>
          )}

          {/* Matches — only show for root item, not when navigated into a match */}
          {matches.length > 0 && history.length === 0 && (
            <div className="detail-matches">
              <div className="matches-label">Possible matches</div>
              {matches.map((m, i) => (
                <MatchCard
                  key={i}
                  match={{ ...m, ...(matchCache[m.itemId] || {}) }}
                  onMatchClick={handleMatchClick}
                  style={{ animationDelay: `${i * 60}ms` }}
                />
              ))}
            </div>
          )}

          {/* CTA */}
          <div className="detail-cta">
            <button className="btn-notify" onClick={onInterest}>
              <Mail size={14} />
              Notify the poster
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="detail-lightbox" onClick={() => setLightbox(false)}>
          <img src={currentItem.image.url} alt={currentItem.title} className="lightbox-img" />
        </div>
      )}
    </>
  );
}
