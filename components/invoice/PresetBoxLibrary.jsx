'use client';

import { motion } from 'framer-motion';
import {
  Hash, Calendar, Building2, MapPin, FileText, Boxes,
  PoundSterling, Percent, Calculator, Banknote, Receipt, StickyNote,
} from 'lucide-react';

const PRESETS = [
  { id: 'invoiceNo', label: 'Invoice #', icon: Hash, w: 160, h: 36, defaultText: 'INV-0001' },
  { id: 'date', label: 'Date', icon: Calendar, w: 140, h: 36, defaultText: '2026-04-29' },
  { id: 'dueDate', label: 'Due Date', icon: Calendar, w: 140, h: 36, defaultText: '2026-05-29' },
  { id: 'buyerName', label: 'Buyer Name', icon: Building2, w: 220, h: 36, defaultText: 'Buyer Company' },
  { id: 'buyerAddress', label: 'Buyer Address', icon: MapPin, w: 260, h: 60, defaultText: '123 Business St, Dubai, UAE' },
  { id: 'buyerTRN', label: 'Buyer TRN', icon: Hash, w: 180, h: 36, defaultText: 'TRN: 123456789012345' },
  { id: 'sellerName', label: 'Seller Name', icon: Building2, w: 220, h: 36, defaultText: 'Your Company' },
  { id: 'sellerAddress', label: 'Seller Address', icon: MapPin, w: 260, h: 60, defaultText: '456 Commerce Ave, Dubai, UAE' },
  { id: 'sellerTRN', label: 'Seller TRN', icon: Hash, w: 180, h: 36, defaultText: 'TRN: 987654321098765' },
  { id: 'itemDesc', label: 'Item Description', icon: FileText, w: 280, h: 36, defaultText: 'Professional Services' },
  { id: 'serialNo', label: 'Serial #', icon: Boxes, w: 160, h: 36, defaultText: 'SN-001' },
  { id: 'qty', label: 'Quantity', icon: Boxes, w: 100, h: 36, defaultText: '1' },
  { id: 'rate', label: 'Rate', icon: PoundSterling, w: 120, h: 36, defaultText: '1000.00' },
  { id: 'amount', label: 'Amount', icon: PoundSterling, w: 140, h: 36, defaultText: '1000.00' },
  { id: 'subtotal', label: 'Subtotal', icon: Calculator, w: 140, h: 36, defaultText: '1000.00' },
  { id: 'vatRate', label: 'VAT Rate', icon: Percent, w: 120, h: 36, defaultText: '5%' },
  { id: 'vat', label: 'VAT Amount', icon: Percent, w: 140, h: 36, defaultText: '50.00' },
  { id: 'total', label: 'Total', icon: Banknote, w: 160, h: 40, defaultText: '1050.00' },
  { id: 'notes', label: 'Notes', icon: StickyNote, w: 300, h: 80, defaultText: 'Payment due within 30 days' },
  { id: 'paymentTerms', label: 'Payment Terms', icon: Receipt, w: 260, h: 36, defaultText: 'Net 30' },
];

export default function PresetBoxLibrary({ onAdd }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-bg-elevated p-3 shadow-md max-h-[600px] overflow-y-auto">
      <p className="text-xs font-bold uppercase tracking-wider text-fg-muted px-1">Preset Fields</p>
      <div className="grid grid-cols-2 gap-1.5">
        {PRESETS.map((preset, i) => {
          const I = preset.icon;
          return (
            <motion.button
              key={preset.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02, duration: 0.2 }}
              onClick={() => onAdd(preset)}
              className="flex items-center gap-2 rounded-lg border border-border bg-bg-muted px-2.5 py-2 text-left text-xs font-medium text-fg transition hover:border-brand hover:bg-brandSoft hover:text-brand"
            >
              <I className="h-3.5 w-3.5 shrink-0 text-fg-muted" />
              <span className="truncate">{preset.label}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
