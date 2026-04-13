import { Smartphone, Key, Briefcase, FileText, Laptop, Watch, Shirt, Package, MapPin } from 'lucide-react';
import { useAppDispatch } from '../context/AppContext';
import { timeAgo } from '../hooks/useTimeAgo';

const CATEGORY_ICONS = {
  phone:       <Smartphone size={26} />,
  keys:        <Key size={26} />,
  bag:         <Briefcase size={26} />,
  documents:   <FileText size={26} />,
  electronics: <Laptop size={26} />,
  accessories: <Watch size={26} />,
  clothing:    <Shirt size={26} />,
  other:       <Package size={26} />,
};

export default function ItemCard({ item }) {
  const dispatch = useAppDispatch();
  const topMatch = item.topMatches?.[0];
  const showMatch = topMatch && topMatch.score > 40;
  function open() { dispatch({ type:'OPEN_POPUP', payload:{ popup:'detail', activeItem:item } }); }
  return (
    <div className="item-card" onClick={open} role="button" tabIndex={0} onKeyDown={e => e.key==='Enter' && open()}>
      <div className="card-img">
        {item.image?.url
          ? <img src={item.image.url} alt={item.title} loading="lazy" />
          : <span className="card-no-img">{CATEGORY_ICONS[item.category] ?? <Package size={26} />}</span>
        }
        <span className={`type-pill type-${item.type}`}>{item.type==='found'?'Found':'Lost'}</span>
        {showMatch && <span className="match-pill">{Math.round(topMatch.score)}% match</span>}
      </div>
      <div className="card-color-bar" style={{
        background: item.dominantColor
          ? `linear-gradient(90deg,${item.dominantColor}88,${item.dominantColor}00)`
          : 'linear-gradient(90deg,#2a2a2a,#1b1b1b)'
      }} />
      <div className="card-body">
        <div className="card-cat-row">
          <span className="card-cat-icon">{CATEGORY_ICONS[item.category] ?? <Package size={10} />}</span>
          <span className="cat-label">{item.category}</span>
        </div>
        <div className="card-title">{item.enriched?.cleanDescription||item.title}</div>
        <div className="card-footer">
          <span className="card-loc"><MapPin size={10}/>{item.location?.replace(/-/g,' ') ?? ''}</span>
          <span className="card-time">{timeAgo(item.createdAt)}</span>
          {item.dominantColor && <span className="color-swatch" style={{ background:item.dominantColor }} />}
        </div>
      </div>
    </div>
  );
}
