import { useEffect, useState } from 'react';
import { MapPin, Smartphone, Key, Briefcase, FileText, Laptop, Watch, Shirt, Package, Wallet, GlassWater, Glasses, Headphones, CreditCard, PenLine } from 'lucide-react';
import { getResolvedItems } from '../api/api';
import { timeAgo } from '../hooks/useTimeAgo';

const CATEGORY_ICONS = {
  phone:       <Smartphone size={24} />,
  keys:        <Key size={24} />,
  bag:         <Briefcase size={24} />,
  documents:   <FileText size={24} />,
  electronics: <Laptop size={24} />,
  accessories: <Watch size={24} />,
  clothing:    <Shirt size={24} />,
  wallet:      <Wallet size={24} />,
  bottle:      <GlassWater size={24} />,
  glasses:     <Glasses size={24} />,
  headphones:  <Headphones size={24} />,
  'id-card':   <CreditCard size={24} />,
  stationery:  <PenLine size={24} />,
  other:       <Package size={24} />,
};

export default function ResolvedStrip() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    getResolvedItems()
      .then(data => setItems(Array.isArray(data) ? data : data.items ?? []))
      .catch(() => {});
  }, []);
  if (!items.length) return null;
  return (
    <div className="resolved-section">
      <div className="resolved-header">
        <div className="resolved-label"><span className="resolved-dot" />Recently resolved</div>
        <span className="text-dim" style={{ fontSize:11 }}>{items.length} items</span>
      </div>
      <div className="resolved-grid">
        {items.map(item => (
          <div key={item._id} className="card-resolved">
            <div className="resolved-img-area">
              <span className="resolved-icon">{CATEGORY_ICONS[item.category] ?? <Package size={24} />}</span>
              <span className="resolved-stamp">Resolved</span>
            </div>
            <div className="resolved-body">
              <div className="resolved-title">{item.title}</div>
              <div className="resolved-meta" style={{ display:'flex', alignItems:'center', gap:4 }}>
                <MapPin size={10} />{item.location?.replace(/-/g,' ') ?? ''} · {timeAgo(item.resolvedAt)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
