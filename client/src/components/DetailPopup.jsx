import { useState, useEffect, useRef } from 'react';
import { X, ArrowLeft, MapPin, Clock, Mail, Flag, Smartphone, Key, Briefcase, FileText, Laptop, Watch, Shirt, Package, Wallet, GlassWater, Glasses, Headphones, CreditCard, PenLine } from 'lucide-react';
import { useAppState, useAppDispatch } from '../context/AppContext';
import MatchCard from './MatchCard';
import { getItem, reportItem } from '../api/api';
import { timeAgo } from '../hooks/useTimeAgo';

const CAT_ICONS = {
  phone: <Smartphone size={22} />, keys: <Key size={22} />, bag: <Briefcase size={22} />,
  documents: <FileText size={22} />, electronics: <Laptop size={22} />, accessories: <Watch size={22} />,
  clothing: <Shirt size={22} />, wallet: <Wallet size={22} />, bottle: <GlassWater size={22} />,
  glasses: <Glasses size={22} />, headphones: <Headphones size={22} />, 'id-card': <CreditCard size={22} />,
  stationery: <PenLine size={22} />, other: <Package size={22} />,
};
const CAT_ICONS_LG = {
  phone: <Smartphone size={44} />, keys: <Key size={44} />, bag: <Briefcase size={44} />,
  documents: <FileText size={44} />, electronics: <Laptop size={44} />, accessories: <Watch size={44} />,
  clothing: <Shirt size={44} />, wallet: <Wallet size={44} />, bottle: <GlassWater size={44} />,
  glasses: <Glasses size={44} />, headphones: <Headphones size={44} />, 'id-card': <CreditCard size={44} />,
  stationery: <PenLine size={44} />, other: <Package size={44} />,
};
const CAT_LABELS = {
  phone: 'Phone', keys: 'Keys', bag: 'Bag', documents: 'Documents', electronics: 'Electronics',
  accessories: 'Accessories', clothing: 'Clothing', wallet: 'Wallet', bottle: 'Bottle',
  glasses: 'Glasses', headphones: 'Headphones', 'id-card': 'ID Card', stationery: 'Stationery', other: 'Other',
};

export default function DetailPopup({ item, onClose }) {
  const { user } = useAppState();
  const dispatch = useAppDispatch();
  const [lightbox, setLightbox] = useState(false);
  const [currentItem, setCurrentItem] = useState(item);
  const [history, setHistory] = useState([]);
  const [matchCache, setMatchCache] = useState({});
  const fetchedRef = useRef(new Set());
  const [reported, setReported] = useState(
    () => !!localStorage.getItem(`cf_reported_${item._id}`)
  );
  const [reportConfirm, setReportConfirm] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    setReported(!!localStorage.getItem(`cf_reported_${currentItem._id}`));
    setReportConfirm(false);
  }, [currentItem._id]);

  useEffect(() => {
    const pending = (currentItem.topMatches || []).filter(m => {
      const id = m.itemId?._id || m.itemId;
      return id && m.score > 40 && !m.title && !fetchedRef.current.has(String(id));
    });
    if (!pending.length) return;

    pending.forEach(m => {
      const id = m.itemId?._id || m.itemId;
      if (!id) return;
      fetchedRef.current.add(String(id));
      getItem(id).then(fetched => {
        if (fetched) {
          setMatchCache(c => ({
            ...c,
            [String(id)]: { title: fetched.title, category: fetched.category, location: fetched.location }
          }));
        }
      }).catch(() => {});
    });
  }, [currentItem]);

  if (!currentItem) return null;

  const matches = (currentItem.topMatches || []).filter(m => m.score > 40);
  const desc = currentItem.enriched?.cleanDescription || currentItem.description;
  const tags = [...(currentItem.enriched?.keywords || []), currentItem.enriched?.color, currentItem.enriched?.brand]
    .filter(t => Boolean(t) && !/^#[0-9a-fA-F]{3,6}$/.test(t));
  const catIcon = CAT_ICONS[currentItem.category] ?? <Package size={22} />;
  const catIconLg = CAT_ICONS_LG[currentItem.category] ?? <Package size={44} />;
  const catLabel = CAT_LABELS[currentItem.category] ?? 'Other';

  const isOwnPost = user && currentItem.posterGmail === user.gmail;
  const showReportBtn = user && !isOwnPost && !reported && history.length === 0;

  function onInterest() {
    if (!user) {
      dispatch({ type: 'OPEN_POPUP', payload: { popup: 'login' } });
      return;
    }
    dispatch({ type: 'OPEN_POPUP', payload: { popup: 'interest', activeItem: currentItem } });
  }

  async function handleMatchClick(match) {
    const id = match.itemId?._id || match.itemId;
    if (!id) return;
    const next = await getItem(id).catch(() => null);
    if (!next) return;
    setHistory(h => [...h, currentItem]);
    setCurrentItem(next);
    setLightbox(false);
  }

  function handleBack() {
    setCurrentItem(history[history.length - 1]);
    setHistory(h => h.slice(0, -1));
    setLightbox(false);
    setReportConfirm(false);
  }

  function startReport(e) {
    e.preventDefault();
    setReportConfirm(true);
  }

  async function confirmReport(e) {
    e.preventDefault();
    setReportLoading(true);
    try {
      const token = localStorage.getItem('cf_token');
      const result = await reportItem(currentItem._id, token);
      setReported(true);
      localStorage.setItem(`cf_reported_${currentItem._id}`, '1');
      setReportConfirm(false);
      if (result.removed) {
        onClose();
        return;
      }
      if (result.reportCount >= 3) {
        setCurrentItem(c => ({ ...c, reportCount: result.reportCount }));
      }
    } catch (err) {
      if (err.status === 409) {
        setReported(true);
        localStorage.setItem(`cf_reported_${currentItem._id}`, '1');
      }
    } finally {
      setReportLoading(false);
    }
  }

  return (
    <>
      <button className="detail-close" onClick={onClose} aria-label="Close">
        <X size={14} />
      </button>

      <div className="detail-grid">
        <div className="detail-img-col">
          <div
            className={`detail-img-area${currentItem.image?.url ? ' clickable' : ''}`}
            onClick={() => currentItem.image?.url && setLightbox(true)}
          >
            {currentItem.image?.url
              ? <img src={currentItem.image.url} alt={currentItem.title} />
              : <span className="detail-no-img">{catIconLg}</span>}
          </div>
          {currentItem.dominantColor && (
            <div
              className="detail-color-bar"
              style={{ background: `linear-gradient(to top, ${currentItem.dominantColor}55, transparent)` }}
            />
          )}
        </div>

        <div className="detail-content-col">
          {history.length > 0 && (
            <button className="detail-back" onClick={handleBack}>
              <ArrowLeft size={13} /> Back
            </button>
          )}

          <div className="detail-meta-row">
            <span className={`type-pill type-${currentItem.type}`} style={{ position: 'static' }}>
              {currentItem.type === 'found' ? 'Found' : 'Lost'}
            </span>
            {currentItem.location && (
              <span className="detail-meta-loc">
                <MapPin size={11} />{currentItem.location.replace(/-/g, ' ')}
              </span>
            )}
            <span className="detail-meta-time">
              <Clock size={11} />{timeAgo(currentItem.createdAt)}
            </span>
            {showReportBtn && (
              <div className="detail-report-wrap">
                {!reportConfirm && (
                  <button className="report-btn" onClick={startReport} title="Report as suspicious">
                    <Flag size={13} />
                  </button>
                )}
                {reportConfirm && (
                  <div className="report-confirm-bar">
                    <div className="report-confirm-head">
                      <Flag size={12} />
                      <span>Flag post?</span>
                    </div>
                    <div className="report-confirm-actions">
                      <button className="rpt-cancel" onClick={() => setReportConfirm(false)}>Cancel</button>
                      <button className="rpt-confirm" onClick={confirmReport} disabled={reportLoading}>
                        {reportLoading ? '...' : 'Confirm'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="detail-cat-row">
            <span className="detail-cat-icon">{catIcon}</span>
            <span className="detail-cat-label">{catLabel}</span>
          </div>

          <h2 className="detail-title">{currentItem.title}</h2>

          {desc && <p className="detail-desc">{desc}</p>}

          {tags.length > 0 && (
            <div className="detail-tags">
              {tags.map((t, i) => <span key={i} className="tag">{t}</span>)}
            </div>
          )}

          {currentItem.reportCount >= 3 && (
            <div className="report-banner">
              <Flag size={13} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>Flagged by multiple users. Proceed with caution.</span>
            </div>
          )}

          {matches.length > 0 && history.length === 0 && (
            <div className="detail-matches">
              <div className="matches-label">Possible matches</div>
              {matches.map((m, i) => {
                const id = String(m.itemId?._id || m.itemId);
                return (
                  <MatchCard
                    key={i}
                    match={{ ...m, ...(matchCache[id] || {}) }}
                    onMatchClick={handleMatchClick}
                    style={{ animationDelay: `${i * 60}ms` }}
                  />
                );
              })}
            </div>
          )}

          <div className="detail-cta">
            <button className="btn-notify" onClick={onInterest}>
              <Mail size={14} />
              Contact poster
            </button>
          </div>
        </div>
      </div>

      {lightbox && (
        <div className="detail-lightbox" onClick={() => setLightbox(false)}>
          <img src={currentItem.image.url} alt={currentItem.title} className="lightbox-img" />
        </div>
      )}
    </>
  );
}
