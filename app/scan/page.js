'use client';

import { useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, Upload, Loader2, Check, X, ScanLine, Sparkles, RotateCw,
} from 'lucide-react';
import Shell from '@/components/dashboard/Shell';
import { BRAND, BRAND_SOFT, INK } from '@/components/dashboard/theme';
import { useLocalList, SEED_TX, formatAED } from '@/lib/webStore';

const Webcam = dynamic(() => import('react-webcam'), { ssr: false });

function parseReceipt(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  let total = 0, merchant = '';
  const amounts = [];
  for (const l of lines) {
    const m = l.match(/(?:total|amount|grand\s*total|aed|dhs|dh)[\s:]*([0-9]+[.,][0-9]{2})/i)
           || l.match(/^([0-9]+[.,][0-9]{2})$/);
    if (m) amounts.push(parseFloat(m[1].replace(',', '.')));
  }
  total = amounts.length ? Math.max(...amounts) : 0;
  merchant = lines[0]?.slice(0, 40) || 'Receipt';
  const vat = +(total * 0.05).toFixed(2);
  return { merchant, total, vat, raw: text };
}

export default function ScanPage() {
  const [mode, setMode] = useState('camera'); // camera | upload
  const [img, setImg] = useState(null);
  const [ocr, setOcr] = useState(null);
  const [running, setRunning] = useState(false);
  const [saved, setSaved] = useState(false);
  const webcamRef = useRef(null);
  const { add } = useLocalList('filey.web.tx', SEED_TX);

  const capture = useCallback(() => {
    const src = webcamRef.current?.getScreenshot();
    if (src) { setImg(src); setOcr(null); setSaved(false); }
  }, []);

  const onUpload = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => { setImg(r.result); setOcr(null); setSaved(false); };
    r.readAsDataURL(f);
  };

  const runOcr = async () => {
    if (!img) return;
    setRunning(true);
    try {
      const Tesseract = (await import('tesseract.js')).default;
      const { data } = await Tesseract.recognize(img, 'eng', { logger: () => {} });
      setOcr(parseReceipt(data.text || ''));
    } catch (e) {
      setOcr({ merchant: 'OCR failed', total: 0, vat: 0, raw: String(e.message || e) });
    }
    setRunning(false);
  };

  const saveTx = () => {
    if (!ocr || !ocr.total) return;
    add({
      name: ocr.merchant,
      merchant: 'Scanned receipt',
      amount: ocr.total,
      vat: ocr.vat,
      type: 'expense',
      category: 'Food',
      status: 'Cleared',
    });
    setSaved(true);
  };

  return (
    <Shell title="Scan" subtitle="Capture receipts w/ browser camera. OCR runs locally via tesseract.js.">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Capture panel */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: BRAND_SOFT }}>
              <ScanLine className="h-4 w-4" style={{ color: BRAND }} />
            </div>
            <h3 className="text-sm font-semibold" style={{ color: INK }}>Capture</h3>
            <div className="ml-auto flex gap-1 rounded-lg bg-slate-100 p-1 text-xs font-semibold">
              <button onClick={() => setMode('camera')} className={`rounded-md px-3 py-1 ${mode === 'camera' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>Camera</button>
              <button onClick={() => setMode('upload')} className={`rounded-md px-3 py-1 ${mode === 'upload' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>Upload</button>
            </div>
          </div>

          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-slate-900">
            {mode === 'camera' && !img && (
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                videoConstraints={{ facingMode: 'environment' }}
                className="h-full w-full object-cover"
              />
            )}
            {img && <img src={img} alt="Capture" className="h-full w-full object-cover" />}
            {!img && mode === 'upload' && (
              <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2 bg-slate-800 text-white">
                <Upload className="h-10 w-10 opacity-70" />
                <span className="text-sm font-semibold">Click to choose image</span>
                <input type="file" accept="image/*" hidden onChange={onUpload} />
              </label>
            )}
            {/* Corner markers */}
            {mode === 'camera' && !img && (
              <>
                {[['top-4 left-4','border-t-2 border-l-2'],['top-4 right-4','border-t-2 border-r-2'],['bottom-4 left-4','border-b-2 border-l-2'],['bottom-4 right-4','border-b-2 border-r-2']].map(([pos, bd]) => (
                  <div key={pos} className={`absolute ${pos} h-10 w-10 ${bd}`} style={{ borderColor: BRAND }} />
                ))}
              </>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            {mode === 'camera' && !img && (
              <button onClick={capture} className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white shadow-lg transition hover:scale-105" style={{ background: BRAND }}>
                <Camera className="h-4 w-4" /> Capture
              </button>
            )}
            {img && (
              <>
                <button onClick={() => { setImg(null); setOcr(null); setSaved(false); }} className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
                  <RotateCw className="h-4 w-4" /> Retake
                </button>
                <button onClick={runOcr} disabled={running} className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white shadow-lg transition hover:scale-105 disabled:opacity-50" style={{ background: BRAND }}>
                  {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {running ? 'Reading…' : 'Extract data'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* OCR Result */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: BRAND_SOFT }}>
              <Sparkles className="h-4 w-4" style={{ color: BRAND }} />
            </div>
            <h3 className="text-sm font-semibold" style={{ color: INK }}>Parsed data</h3>
          </div>

          {!ocr && (
            <div className="flex h-[300px] flex-col items-center justify-center gap-3 text-slate-400">
              <ScanLine className="h-10 w-10" />
              <span className="text-sm">Capture or upload a receipt to see OCR results</span>
            </div>
          )}

          {ocr && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              <Row label="Merchant"  value={ocr.merchant} />
              <Row label="Total"     value={formatAED(ocr.total)} big />
              <Row label="VAT (5%)"  value={formatAED(ocr.vat)} />
              <Row label="Category"  value="Food (auto)" />
              <details className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                <summary className="cursor-pointer font-semibold text-slate-600">Raw OCR text</summary>
                <pre className="mt-2 whitespace-pre-wrap text-slate-500">{ocr.raw}</pre>
              </details>
              {!saved ? (
                <button onClick={saveTx} disabled={!ocr.total} className="inline-flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white shadow-lg transition hover:scale-105 disabled:opacity-50" style={{ background: BRAND }}>
                  <Check className="h-4 w-4" /> Save as transaction
                </button>
              ) : (
                <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 py-3 text-sm font-bold text-emerald-600">
                  <Check className="h-4 w-4" /> Saved to transactions
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: BRAND_SOFT }}>
            <Sparkles className="h-5 w-5" style={{ color: BRAND }} />
          </div>
          <div>
            <h3 className="font-bold" style={{ color: INK }}>100% local OCR</h3>
            <p className="mt-1 text-sm text-slate-600">
              Tesseract.js runs a WebAssembly OCR engine right in your browser. Your receipt image never leaves this device.
              For Arabic receipts, the iOS app uses Vision framework w/ bilingual support — coming to web in next release.
            </p>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function Row({ label, value, big }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0">
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      <span className={`${big ? 'text-2xl font-bold' : 'text-sm font-semibold'}`} style={{ color: INK }}>{value}</span>
    </div>
  );
}
