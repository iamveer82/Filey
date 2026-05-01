'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText, Image, File, Trash2, Download, Move, MoreVertical,
  Clock, Eye, X, Check, FolderOpen, Share2,
} from 'lucide-react';
import { SCALE_IN } from '@/lib/design/motion';

const TOOL_ICONS = {
  merge: 'Layers',
  split: 'Split',
  compress: 'Minimize2',
  protect: 'Lock',
  watermark: 'Eye',
  sign: 'Edit3',
  rotate: 'QrCode',
  receipt: 'Receipt',
  invoice: 'FilePlus',
};

const TOOL_COLORS = {
  merge: '#8B5CF6',
  split: '#10B981',
  compress: '#3B82F6',
  protect: '#EF4444',
  watermark: '#D946EF',
  sign: '#F59E0B',
  rotate: 'hsl(var(--brand))',
  receipt: '#059669',
  invoice: 'hsl(var(--brand))',
};

function FileIcon({ type }) {
  if (type?.startsWith('image/')) return <Image className="h-5 w-5 text-fg-muted" />;
  if (type?.includes('pdf')) return <FileText className="h-5 w-5 text-danger" />;
  return <File className="h-5 w-5 text-fg-muted" />;
}

export default function FileCard({ file, index, onDelete, onMove, onDownload, onPreview, onShare, folders }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const toolColor = TOOL_COLORS[file.tool] || 'hsl(var(--brand))';
  const dateStr = file.createdAt
    ? new Date(file.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : '';

  const handleDelete = () => {
    onDelete?.(file.id);
    setConfirmDelete(false);
    setMenuOpen(false);
  };

  const handleMove = (folderId) => {
    onMove?.(file.id, folderId);
    setMoveOpen(false);
    setMenuOpen(false);
  };

  return (
    <motion.div
      {...SCALE_IN}
      transition={{ delay: index * 0.04, duration: 0.25 }}
      layout
      className="group relative flex flex-col gap-3 rounded-2xl border border-border bg-bg-elevated p-4 transition card-hover"
    >
      {/* Top row: icon + actions */}
      <div className="flex items-start justify-between">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${toolColor}15` }}
        >
          <FileIcon type={file.type} />
        </div>

        <div className="relative">
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="rounded-lg p-1.5 text-fg-subtle opacity-0 transition hover:bg-bg-muted hover:text-fg group-hover:opacity-100"
            aria-label="File actions"
          >
            <MoreVertical className="h-4 w-4" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="absolute right-0 top-8 z-50 min-w-[160px] rounded-xl border border-border bg-bg-elevated p-1 shadow-lg"
              >
                {onDownload && (
                  <button
                    onClick={() => { onDownload(file); setMenuOpen(false); }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-fg hover:bg-bg-muted"
                  >
                    <Download className="h-4 w-4" /> Download
                  </button>
                )}
                {onPreview && (
                  <button
                    onClick={() => { onPreview(file); setMenuOpen(false); }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-fg hover:bg-bg-muted"
                  >
                    <Eye className="h-4 w-4" /> Preview
                  </button>
                )}
                {onShare && (
                  <button
                    onClick={() => { onShare(file); setMenuOpen(false); }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-fg hover:bg-bg-muted"
                  >
                    <Share2 className="h-4 w-4" /> Share
                  </button>
                )}
                <button
                  onClick={() => { setMoveOpen(true); }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-fg hover:bg-bg-muted"
                >
                  <Move className="h-4 w-4" /> Move to…
                </button>
                <div className="my-1 h-px bg-border" />
                <button
                  onClick={() => { setConfirmDelete(true); }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-danger hover:bg-danger-soft"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              </motion.div>
            </>
          )}

          {/* Move submenu */}
          {moveOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute right-0 top-8 z-50 min-w-[160px] rounded-xl border border-border bg-bg-elevated p-1 shadow-lg"
            >
              <div className="px-3 py-1.5 text-xs font-bold text-fg-muted uppercase tracking-wider">Folders</div>
              {folders.map(f => (
                <button
                  key={f.id}
                  onClick={() => handleMove(f.id)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-fg hover:bg-bg-muted"
                >
                  <FolderOpen className="h-4 w-4 text-fg-muted" /> {f.name}
                </button>
              ))}
              <button
                onClick={() => handleMove('All')}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-fg-muted hover:bg-bg-muted"
              >
                <X className="h-4 w-4" /> Uncategorized
              </button>
            </motion.div>
          )}

          {/* Confirm delete */}
          {confirmDelete && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute right-0 top-8 z-50 w-52 rounded-xl border border-border bg-bg-elevated p-3 shadow-lg"
            >
              <p className="text-sm font-semibold text-fg">Delete file?</p>
              <p className="mt-1 text-xs text-fg-muted">This cannot be undone.</p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 rounded-lg bg-bg-muted py-1.5 text-xs font-bold text-fg hover:bg-border"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 rounded-lg bg-danger py-1.5 text-xs font-bold text-white hover:bg-danger/90"
                >
                  <Check className="mx-auto h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* File info */}
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-fg" title={file.name}>{file.name}</p>
        <div className="mt-1 flex items-center gap-2 text-xs text-fg-muted">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" /> {dateStr}
          </span>
          {file.tool && (
            <span
              className="rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
              style={{ backgroundColor: `${toolColor}15`, color: toolColor }}
            >
              {file.tool}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
