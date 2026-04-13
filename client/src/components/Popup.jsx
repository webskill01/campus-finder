import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useAppState, useAppDispatch } from '../context/AppContext';
import LoginPopup from './LoginPopup';
import PostPopup from './PostPopup';
import DetailPopup from './DetailPopup';
import InterestPopup from './InterestPopup';

export default function Popup() {
  const { popup, activeItem } = useAppState();
  const dispatch = useAppDispatch();
  if (!popup) return null;

  function close() { dispatch({ type: 'CLOSE_POPUP' }); }
  const isDetail = popup === 'detail';

  return createPortal(
    <div className="popup-backdrop" onClick={e => e.target === e.currentTarget && close()}>
      <div className={`popup-panel${isDetail ? ' detail-popup wide' : ''}`} role="dialog" aria-modal="true">
        <div className="popup-drag-handle" />
        {!isDetail && (
          <button className="popup-close" onClick={close} aria-label="Close"><X size={14} /></button>
        )}
        {isDetail ? (
          <DetailPopup item={activeItem} onClose={close} />
        ) : (
          <div className="popup-body">
            {popup === 'login'    && <LoginPopup />}
            {popup === 'post'     && <PostPopup onClose={close} />}
            {popup === 'interest' && <InterestPopup item={activeItem} onClose={close} />}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
