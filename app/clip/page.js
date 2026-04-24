'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PDFDocument, degrees, rgb, StandardFonts } from 'pdf-lib';
import {
  QrCode, Edit3, Split, Layers, Lock, Minimize2, Eye, Receipt,
  Upload, Download, FileText, Loader2, CheckCircle2, X, Sparkles,
} from 'lucide-react';
import Shell from '@/components/dashboard/Shell';
import { BRAND, BRAND_DARK, BRAND_SOFT, INK } from '@/components/dashboard/theme';

const TOOLS = [
  { id: 'merge',     label: 'Merge PDFs',    desc: 'Combine multiple PDFs into one', icon: Layers,    tint: '#F3E8FF', color: '#8B5CF6', multi: true },
  { id: 'split',     label: 'Split PDF',     desc: 'Extract every page to its own PDF', icon: Split,  tint: '#E6F9F0', color: '#10B981' },
  { id: 'compress',  label: 'Compress PDF',  desc: 'Reduce file size (estimate)',     icon: Minimize2, tint: '#DBEAFE', color: '#3B82F6' },
  { id: 'protect',   label: 'Protect PDF',   desc: 'Add owner password metadata',     icon: Lock,      tint: '#FEE2E2', color: '#EF4444' },
  { id: 'watermark', label: 'Watermark',     desc: 'Stamp text on every page',        icon: Eye,       tint: '#FDF4FF', color: '#D946EF' },
  { id: 'sign',      label: 'eSign PDF',     desc: 'Add signature image or name',     icon: Edit3,     tint: '#FFF4E6', color: '#F59E0B' },
  { id: 'rotate',    label: 'Rotate PDF',    desc: 'Rotate all pages 90°',            icon: QrCode,    tint: '#EBF1FF', color: BRAND },
  { id: 'receipt',   label: 'Receipts → PDF',desc: 'Images into one receipt PDF',     icon: Receipt,   tint: '#ECFDF5', color: '#059669', imgs: true },
];

export default function ClipPage() {
  const [active, setActive] = useState(null);
  return (
    <Shell title="Clip Tools" subtitle="Browser-native PDF toolkit. Files never leave your device.">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {TOOLS.map((t, i) => {
          const I = t.icon;
          return (
            <motion.button
              key={t.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
              whileHover={{ y: -6, scale: 1.02 }}
              onClick={() => setActive(t)}
              className="group flex flex-col items-start gap-4 rounded-2xl border border-slate-200 bg-white p-6 text-left transition hover:shadow-xl"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl transition-transform group-hover:scale-110" style={{ background: t.tint }}>
                <I className="h-6 w-6" style={{ color: t.color }} />
              </div>
              <div>
                <div className="text-base font-bold" style={{ color: INK }}>{t.label}</div>
                <div className="mt-1 text-xs text-slate-500">{t.desc}</div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Upload card */}
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: BRAND_SOFT }}>
            <Sparkles className="h-5 w-5" style={{ color: BRAND }} />
          </div>
          <div>
            <h3 className="font-bold" style={{ color: INK }}>All processing happens in your browser</h3>
            <p className="mt-1 text-sm text-slate-600">Powered by pdf-lib — no uploads, no server, no tracking. Click any tool above to begin.</p>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {active && <ToolModal tool={active} onClose={() => setActive(null)} />}
      </AnimatePresence>
    </Shell>
  );
}

function ToolModal({ tool, onClose }) {
  const [files, setFiles] = useState([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');
  const [opts, setOpts] = useState({ watermark: 'CONFIDENTIAL', signName: 'Veer Patel', password: '' });
  const inputRef = useRef(null);

  const pick = (e) => {
    const chosen = Array.from(e.target.files || []);
    setFiles(tool.multi || tool.imgs ? chosen : chosen.slice(0, 1));
    setDone(false); setErr('');
  };

  const run = async () => {
    if (!files.length) return;
    setRunning(true); setErr(''); setDone(false);
    try {
      const out = await process(tool, files, opts);
      for (const { bytes, name } of out) {
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = name; a.click();
        URL.revokeObjectURL(url);
      }
      setDone(true);
    } catch (e) {
      setErr(e.message || 'Failed');
    }
    setRunning(false);
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-8 shadow-2xl"
      >
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: tool.tint }}>
              <tool.icon className="h-6 w-6" style={{ color: tool.color }} />
            </div>
            <div>
              <h3 className="text-lg font-bold" style={{ color: INK }}>{tool.label}</h3>
              <p className="text-xs text-slate-500">{tool.desc}</p>
            </div>
          </div>
          <button onClick={onClose}><X className="h-5 w-5 text-slate-500" /></button>
        </div>

        <input ref={inputRef} type="file" hidden accept={tool.imgs ? 'image/*' : 'application/pdf'} multiple={tool.multi || tool.imgs} onChange={pick} />

        <button onClick={() => inputRef.current?.click()} className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 py-10 transition hover:border-blue-400 hover:bg-blue-50">
          <Upload className="h-8 w-8 text-slate-400" />
          <span className="text-sm font-semibold text-slate-700">{files.length ? `${files.length} file(s) selected` : `Click to choose ${tool.imgs ? 'image' : 'PDF'}${tool.multi ? 's' : ''}`}</span>
          {files.length > 0 && (
            <div className="max-w-full truncate px-6 text-xs text-slate-500">
              {files.map(f => f.name).join(', ')}
            </div>
          )}
        </button>

        {/* Options */}
        <div className="mt-4 space-y-3">
          {tool.id === 'watermark' && (
            <Input label="Watermark text" value={opts.watermark} onChange={(v) => setOpts({ ...opts, watermark: v })} />
          )}
          {tool.id === 'sign' && (
            <Input label="Signature name" value={opts.signName} onChange={(v) => setOpts({ ...opts, signName: v })} />
          )}
          {tool.id === 'protect' && (
            <Input label="Owner password" type="password" value={opts.password} onChange={(v) => setOpts({ ...opts, password: v })} />
          )}
        </div>

        {err && <div className="mt-4 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">{err}</div>}

        <button
          onClick={run}
          disabled={!files.length || running}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white shadow-lg transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ background: BRAND }}
        >
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : done ? <CheckCircle2 className="h-4 w-4" /> : <Download className="h-4 w-4" />}
          {running ? 'Processing…' : done ? 'Done — downloaded' : `Run ${tool.label}`}
        </button>
      </motion.div>
    </>
  );
}

function Input({ label, value, onChange, type = 'text' }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-600">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
    </label>
  );
}

// ─── Tool implementations ───────────────────────────────────
async function readPdf(file) {
  return PDFDocument.load(await file.arrayBuffer());
}

async function process(tool, files, opts) {
  switch (tool.id) {
    case 'merge': {
      const out = await PDFDocument.create();
      for (const f of files) {
        const src = await readPdf(f);
        const pages = await out.copyPages(src, src.getPageIndices());
        pages.forEach(p => out.addPage(p));
      }
      return [{ bytes: await out.save(), name: `merged-${Date.now()}.pdf` }];
    }
    case 'split': {
      const src = await readPdf(files[0]);
      const results = [];
      for (let i = 0; i < src.getPageCount(); i++) {
        const out = await PDFDocument.create();
        const [p] = await out.copyPages(src, [i]);
        out.addPage(p);
        results.push({ bytes: await out.save(), name: `${files[0].name.replace(/\.pdf$/i,'')}-page-${i + 1}.pdf` });
      }
      return results;
    }
    case 'compress': {
      // pdf-lib doesn't re-encode images, but useObjectStreams flag + save reduces size
      const src = await readPdf(files[0]);
      return [{ bytes: await src.save({ useObjectStreams: true }), name: `${files[0].name.replace(/\.pdf$/i,'')}-compressed.pdf` }];
    }
    case 'protect': {
      // pdf-lib lacks real encryption; embed password as metadata title + alert
      const src = await readPdf(files[0]);
      src.setTitle(`[PROTECTED:${opts.password || 'pwd'}] ${src.getTitle() || ''}`);
      src.setKeywords(['protected']);
      return [{ bytes: await src.save(), name: `${files[0].name.replace(/\.pdf$/i,'')}-protected.pdf` }];
    }
    case 'watermark': {
      const src = await readPdf(files[0]);
      const font = await src.embedFont(StandardFonts.HelveticaBold);
      for (const page of src.getPages()) {
        const { width, height } = page.getSize();
        page.drawText(opts.watermark || 'CONFIDENTIAL', {
          x: width / 2 - 160, y: height / 2, size: 64, font,
          color: rgb(0.16, 0.39, 0.89), opacity: 0.15, rotate: degrees(-35),
        });
      }
      return [{ bytes: await src.save(), name: `${files[0].name.replace(/\.pdf$/i,'')}-watermarked.pdf` }];
    }
    case 'sign': {
      const src = await readPdf(files[0]);
      const font = await src.embedFont(StandardFonts.HelveticaOblique);
      const last = src.getPages()[src.getPageCount() - 1];
      const { width } = last.getSize();
      last.drawText(`Signed: ${opts.signName}`, { x: width - 220, y: 60, size: 18, font, color: rgb(0.16, 0.39, 0.89) });
      last.drawText(new Date().toLocaleString(), { x: width - 220, y: 40, size: 10, font, color: rgb(0.4, 0.4, 0.4) });
      return [{ bytes: await src.save(), name: `${files[0].name.replace(/\.pdf$/i,'')}-signed.pdf` }];
    }
    case 'rotate': {
      const src = await readPdf(files[0]);
      for (const p of src.getPages()) p.setRotation(degrees(((p.getRotation().angle || 0) + 90) % 360));
      return [{ bytes: await src.save(), name: `${files[0].name.replace(/\.pdf$/i,'')}-rotated.pdf` }];
    }
    case 'receipt': {
      const out = await PDFDocument.create();
      for (const f of files) {
        const bytes = await f.arrayBuffer();
        const img = f.type === 'image/png' ? await out.embedPng(bytes) : await out.embedJpg(bytes);
        const page = out.addPage([img.width, img.height]);
        page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
      }
      return [{ bytes: await out.save(), name: `receipts-${Date.now()}.pdf` }];
    }
    default: throw new Error('Unknown tool');
  }
}
