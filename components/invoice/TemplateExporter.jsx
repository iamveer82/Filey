'use client';

import { useState } from 'react';
import { PDFDocument, rgb } from 'pdf-lib';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function TemplateExporter({
  canvasRef,
  backgroundImage,
  boxes,
  brushStrokes,
  invoiceMeta,
}) {
  const [busy, setBusy] = useState(false);

  const exportPDF = async () => {
    setBusy(true);
    try {
      const canvas = canvasRef.current;
      if (!canvas) throw new Error('Canvas not ready');

      // Rasterize the canvas to image
      const dataUrl = canvas.toDataURL('image/png', 1.0);
      const res = await fetch(dataUrl);
      const imgBytes = new Uint8Array(await res.arrayBuffer());

      // Create PDF
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.28, 841.89]); // A4 points
      const { width, height } = page.getSize();

      // Embed background image
      const embeddedImg = await pdfDoc.embedPng(imgBytes);
      page.drawImage(embeddedImg, {
        x: 0,
        y: 0,
        width,
        height,
      });

      // Draw text boxes on top
      const font = await pdfDoc.embedFont('Helvetica');
      const fontBold = await pdfDoc.embedFont('Helvetica-Bold');

      for (const box of boxes) {
        if (!box.text) continue;
        const pdfX = (box.x / 794) * width;
        const pdfY = height - ((box.y + box.h) / 1123) * height;
        const pdfSize = Math.max(8, Math.min(14, (box.h / 1123) * height * 0.4));

        page.drawText(box.text, {
          x: pdfX + 4,
          y: pdfY + 4,
          size: pdfSize,
          font: box.bold ? fontBold : font,
          color: rgb(0.04, 0.08, 0.2),
        });
      }

      const bytes = await pdfDoc.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-template-${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Invoice PDF exported');
    } catch (e) {
      toast.error(`Export failed: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const exportJSON = () => {
    const data = {
      version: 1,
      createdAt: new Date().toISOString(),
      meta: invoiceMeta || {},
      boxes: boxes.map(b => ({
        id: b.id,
        presetId: b.presetId,
        x: b.x,
        y: b.y,
        w: b.w,
        h: b.h,
        text: b.text,
        presetLabel: b.presetLabel,
      })),
      brushStrokes: brushStrokes.map(s => ({
        tool: s.tool,
        color: s.color,
        size: s.size,
        points: s.points,
      })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-template-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Template layout saved');
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={exportJSON}
        className="inline-flex items-center gap-2 rounded-xl border border-border bg-bg-elevated px-4 py-2.5 text-sm font-semibold text-fg transition hover:bg-bg-muted"
      >
        Save Layout
      </button>
      <button
        onClick={exportPDF}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white shadow-lg transition hover:scale-105 disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        {busy ? 'Exporting…' : 'Export PDF'}
      </button>
    </div>
  );
}
