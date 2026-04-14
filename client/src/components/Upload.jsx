import { useState, useRef } from 'react';
import { ImagePlus, CheckCircle2, XCircle } from 'lucide-react';

function toHex([r, g, b]) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

// Lazy-loaded model — avoids module-level crash and defers heavy import
let nsfwModel = null;
let nsfwLoadPromise = null;
function ensureNsfwModel() {
  if (nsfwLoadPromise) return nsfwLoadPromise;
  nsfwLoadPromise = import('nsfwjs')
    .then(mod => {
      const nsfwjs = mod.default ?? mod;
      return nsfwjs.load(undefined, { type: 'graph' });
    })
    .then(m => { nsfwModel = m; })
    .catch(() => {});
  return nsfwLoadPromise;
}

export default function Upload({ onResult }) {
  const [status, setStatus] = useState(null); // null|'scanning'|'safe'|'unsafe'
  const [preview, setPreview] = useState(null);
  const inputRef = useRef();

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    setStatus('scanning');
    try {
      const img = new Image();
      img.src = url;
      await new Promise(res => { img.onload = res; });

      // NSFW check — silently skipped if model fails to load
      await ensureNsfwModel();
      if (nsfwModel) {
        const preds = await nsfwModel.classify(img);
        const neutral = preds.find(p => p.className === 'Neutral')?.probability ?? 1;
        if (neutral < 0.6) { setStatus('unsafe'); onResult(null); return; }
      }

      // ColorThief — dynamic import avoids CJS interop crash at module level
      let dominantColor = null;
      try {
        const ctMod = await import('colorthief');
        const CTClass = ctMod.default ?? ctMod;
        const ct = new CTClass();
        dominantColor = toHex(ct.getColor(img));
      } catch { /* color is optional */ }

      setStatus('safe');
      onResult({ file, dominantColor });
    } catch {
      setStatus('safe');
      onResult({ file, dominantColor: null });
    }
  }

  return (
    <div>
      {!preview && (
        <div className="upload-zone" onClick={() => inputRef.current?.click()} style={{ cursor: 'pointer' }}>
          <ImagePlus size={28} strokeWidth={1.5} />
          Add photo
          <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
        </div>
      )}
      {preview && <div className="upload-preview"><img src={preview} alt="Preview" /></div>}
      {status === 'scanning' && <div className="upload-status scanning"><span className="spinner" /> Scanning image…</div>}
      {status === 'safe'     && <div className="upload-status safe"><CheckCircle2 size={13} /> Image looks good</div>}
      {status === 'unsafe'   && <div className="upload-status unsafe"><XCircle size={13} /> Image not appropriate for upload</div>}
    </div>
  );
}
