import { useState, useRef } from 'react';
import { ImagePlus, CheckCircle2, XCircle } from 'lucide-react';
import * as nsfwjs from 'nsfwjs';
import * as ColorThiefModule from 'colorthief';

const NSFW_MODEL_URL = 'https://nsfw-model-1.s3.us-east-2.amazonaws.com/quant_nsfw_mobilenet/';

let nsfwModel = null;
nsfwjs.load(NSFW_MODEL_URL, { type: 'graph' }).then(m => { nsfwModel = m; }).catch(() => {});

function toHex([r, g, b]) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

const CT = ColorThiefModule.default ?? ColorThiefModule;
const ct = new CT();

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
      img.crossOrigin = 'anonymous';
      img.src = url;
      await new Promise(res => { img.onload = res; });
      if (nsfwModel) {
        const preds = await nsfwModel.classify(img);
        const neutral = preds.find(p => p.className === 'Neutral')?.probability ?? 1;
        if (neutral < 0.6) { setStatus('unsafe'); onResult(null); return; }
      }
      const color = ct.getColor(img);
      setStatus('safe');
      onResult({ file, dominantColor: toHex(color) });
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
          Add a photo (optional)
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
