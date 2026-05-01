'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Folder, FolderPlus, Trash2, Grid3X3, List, X,
  FileText, Receipt, FileImage, File, Filter, ChevronRight,
  Download, Share2, Copy, Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import FileCard from './FileCard';
import { FADE_UP, FADE_IN, stagger } from '@/lib/design/motion';

import {
  listFiles, deleteFile, moveFileToFolder,
  searchFiles, listFolders, createFolder, deleteFolder, getFileStats,
  getFileBlobUrl,
} from '@/lib/clipStorage';

const BUILT_IN_FOLDERS = [
  { id: 'All', name: 'All Files', icon: FileText },
  { id: 'Receipts', name: 'Receipts', icon: Receipt },
  { id: 'Invoices', name: 'Invoices', icon: FileText },
  { id: 'PDFs', name: 'PDFs', icon: FileImage },
  { id: 'Scans', name: 'Scans', icon: FileImage },
];

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

export default function FileManager() {
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [activeFolder, setActiveFolder] = useState('All');
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Dialogs
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [previewFile, setPreviewFile] = useState(null);
  const [shareFile, setShareFile] = useState(null);
  const [shareToken, setShareToken] = useState('');
  const [shareCopied, setShareCopied] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [f, fo, s] = await Promise.all([
        listFiles(activeFolder === 'All' ? null : activeFolder),
        listFolders(),
        getFileStats(),
      ]);
      setFiles(f);
      setFolders(fo);
      setStats(s);
    } catch (e) {
      console.error('[FileManager] load error:', e);
    } finally {
      setIsLoading(false);
    }
  }, [activeFolder]);

  useEffect(() => { load(); }, [load]);

  // Search debounce
  useEffect(() => {
    if (!query.trim()) { load(); return; }
    const t = setTimeout(async () => {
      const r = await searchFiles(query);
      setFiles(r);
    }, 250);
    return () => clearTimeout(t);
  }, [query, load]);

  const allFolders = useMemo(() => {
    const builtIn = BUILT_IN_FOLDERS.map(f => ({ ...f, builtIn: true }));
    const custom = folders.map(f => ({ ...f, builtIn: false, icon: Folder }));
    return [...builtIn, ...custom];
  }, [folders]);

  const activeFolderData = allFolders.find(f => f.id === activeFolder) || allFolders[0];

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    await createFolder(newFolderName.trim());
    setNewFolderName('');
    setNewFolderOpen(false);
    load();
  };

  const handleDeleteFolder = async (id) => {
    if (!confirm('Delete this folder? Files will move to Uncategorized.')) return;
    await deleteFolder(id);
    if (activeFolder === id) setActiveFolder('All');
    load();
  };

  const handleDeleteFile = async (id) => {
    await deleteFile(id);
    load();
  };

  const handleMoveFile = async (fileId, folderId) => {
    await moveFileToFolder(fileId, folderId);
    load();
  };

  const handleDownload = async (file) => {
    const url = await getFileBlobUrl(file.id);
    if (!url) {
      // Fallback to ephemeral blobUrl if stored directly
      if (!file.blobUrl) return;
      const a = document.createElement('a');
      a.href = file.blobUrl; a.download = file.name; a.click();
      return;
    }
    const a = document.createElement('a');
    a.href = url; a.download = file.name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const handleShare = async (file) => {
    const url = await getFileBlobUrl(file.id);
    const blobUrl = url || file.blobUrl;
    if (!blobUrl) return;
    if (navigator.share) {
      try {
        const response = await fetch(blobUrl);
        const blob = await response.blob();
        const f = new File([blob], file.name, { type: blob.type });
        await navigator.share({ files: [f], title: file.name });
      } catch { /* user cancelled */ }
    } else {
      handleDownload(file);
    }
    if (url) setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const handlePreview = async (file) => {
    const url = await getFileBlobUrl(file.id);
    if (url) {
      setPreviewFile({ ...file, blobUrl: url });
    } else if (file.blobUrl) {
      setPreviewFile(file);
    }
  };

  const openShareDialog = async (file) => {
    setShareFile(file);
    setShareCopied(false);
    try {
      const res = await fetch('/api/clip/files', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'share', fileId: file.id }),
      });
      const j = await res.json();
      if (j.ok) setShareToken(j.data.token);
      else setShareToken('');
    } catch {
      setShareToken('');
    }
  };

  const folderCounts = useMemo(() => {
    const counts = { All: stats?.total || 0 };
    Object.entries(stats?.byCategory || {}).forEach(([key, count]) => { counts[key] = count; });
    if (!counts.All) counts.All = files.length;
    return counts;
  }, [stats, files]);

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      {/* Sidebar — folders */}
      <motion.aside
        {...FADE_UP}
        className="w-full shrink-0 lg:w-60"
      >
        <div className="rounded-2xl border border-border bg-bg-elevated p-3">
          <div className="mb-2 flex items-center justify-between px-2">
            <span className="text-xs font-bold uppercase tracking-wider text-fg-muted">Folders</span>
            <button
              onClick={() => setNewFolderOpen(true)}
              className="rounded-lg p-1 text-fg-muted transition hover:bg-bg-muted hover:text-brand"
              aria-label="New folder"
            >
              <FolderPlus className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-0.5">
            {allFolders.map((f) => {
              const Icon = f.icon || Folder;
              const isActive = activeFolder === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setActiveFolder(f.id)}
                  className={`group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-semibold transition ${
                    isActive
                      ? 'bg-brand-soft text-brand'
                      : 'text-fg-muted hover:bg-bg-muted hover:text-fg'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-left truncate">{f.name}</span>
                  <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${isActive ? 'bg-brand/10 text-brand' : 'bg-bg-muted text-fg-subtle'}`}>
                    {folderCounts[f.id] || 0}
                  </span>
                  {!f.builtIn && (
                    <span
                      onClick={(e) => { e.stopPropagation(); handleDeleteFolder(f.id); }}
                      className="rounded p-1 text-fg-subtle opacity-0 transition hover:text-danger group-hover:opacity-100"
                    >
                      <Trash2 className="h-3 w-3" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Stats mini card */}
        {stats && (
          <div className="mt-3 rounded-2xl border border-border bg-bg-elevated p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-fg-muted">Storage</div>
            <div className="mt-2 flex items-end gap-1">
              <span className="text-2xl font-black text-fg">{stats.total}</span>
              <span className="mb-1 text-xs text-fg-muted">files</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-bg-muted">
              <motion.div
                className="h-full rounded-full bg-brand"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(stats.total * 5, 100)}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}
      </motion.aside>

      {/* Main area */}
      <div className="min-w-0 flex-1">
        {/* Toolbar */}
        <motion.div
          {...FADE_UP}
          className="mb-4 flex flex-wrap items-center gap-3"
        >
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search files…"
              className="pl-9"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-fg-subtle hover:text-fg"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-xl border border-border bg-bg-elevated p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`rounded-lg p-1.5 transition ${viewMode === 'grid' ? 'bg-bg-muted text-fg' : 'text-fg-subtle hover:text-fg'}`}
                aria-label="Grid view"
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`rounded-lg p-1.5 transition ${viewMode === 'list' ? 'bg-bg-muted text-fg' : 'text-fg-subtle hover:text-fg'}`}
                aria-label="List view"
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            <div className="hidden items-center gap-1 rounded-xl border border-border bg-bg-elevated px-3 py-1.5 text-xs text-fg-muted sm:flex">
              <Filter className="h-3 w-3" />
              {activeFolderData?.name}
              <ChevronRight className="h-3 w-3" />
              {files.length} files
            </div>
          </div>
        </motion.div>

        {/* Files grid/list */}
        {isLoading ? (
          <div className={`grid gap-3 ${viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-bg-elevated" />
            ))}
          </div>
        ) : files.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No files yet"
            description={query ? `No results for "${query}"` : `${activeFolderData?.name} is empty. Run a tool above to create files.`}
          />
        ) : viewMode === 'grid' ? (
          <motion.div
            className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4"
            initial="hidden"
            animate="visible"
            variants={stagger(0.03)}
          >
            <AnimatePresence mode="popLayout">
              {files.map((file, i) => (
                <FileCard
                  key={file.id}
                  file={file}
                  index={i}
                  folders={allFolders}
                  onDelete={handleDeleteFile}
                  onMove={handleMoveFile}
                  onDownload={handleDownload}
                  onPreview={handlePreview}
                  onShare={openShareDialog}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <div className="rounded-2xl border border-border bg-bg-elevated overflow-hidden">
            {files.map((file, i) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0 transition hover:bg-bg-muted"
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${TOOL_COLORS[file.tool] || 'hsl(var(--brand))'}15` }}
                >
                  <FileText className="h-4 w-4 text-fg-muted" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-fg">{file.name}</p>
                  <p className="text-xs text-fg-muted">
                    {file.tool && <span className="mr-2 capitalize">{file.tool}</span>}
                    {file.createdAt ? new Date(file.createdAt).toLocaleDateString() : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleDownload(file)} className="rounded-lg p-2 text-fg-subtle hover:bg-bg-muted hover:text-fg">
                    <Download className="h-4 w-4" />
                  </button>
                  <button onClick={() => openShareDialog(file)} className="rounded-lg p-2 text-fg-subtle hover:bg-bg-muted hover:text-fg">
                    <Share2 className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDeleteFile(file.id)} className="rounded-lg p-2 text-fg-subtle hover:bg-danger-soft hover:text-danger">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* New folder dialog */}
      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-fg">New Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              autoFocus
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setNewFolderOpen(false)}>Cancel</Button>
              <Button variant="brand" className="flex-1" onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview dialog */}
      <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-auto p-0">
          {previewFile?.dataUrl || previewFile?.blobUrl ? (
            <iframe
              src={previewFile.dataUrl || previewFile.blobUrl}
              className="h-[70vh] w-full rounded-lg"
              title={previewFile.name}
            />
          ) : (
            <div className="p-8 text-center text-fg-muted">No preview available</div>
          )}
        </DialogContent>
      </Dialog>

      {/* Share dialog */}
      <Dialog open={!!shareFile} onOpenChange={() => { setShareFile(null); setShareToken(''); setShareCopied(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-fg">Share File</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-fg-muted">
              Share <span className="font-semibold text-fg">{shareFile?.name}</span> with others.
            </p>
            {shareToken ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 rounded-xl border border-border bg-bg-muted px-3 py-2">
                  <code className="flex-1 truncate text-xs text-fg">{`${typeof window !== 'undefined' ? window.location.origin : ''}/api/clip/files?token=${shareToken}`}</code>
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(`${typeof window !== 'undefined' ? window.location.origin : ''}/api/clip/files?token=${shareToken}`);
                      setShareCopied(true);
                      setTimeout(() => setShareCopied(false), 2000);
                    }}
                    className="rounded-lg p-1.5 text-fg-subtle hover:bg-bg-elevated hover:text-brand transition"
                  >
                    {shareCopied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-fg-muted">Link expires in 24 hours.</p>
              </div>
            ) : (
              <div className="rounded-xl bg-bg-muted p-4 text-center text-sm text-fg-muted">
                Generating share link…
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setShareFile(null); setShareToken(''); }}>Close</Button>
              <Button variant="brand" className="flex-1" onClick={() => shareFile && handleDownload(shareFile)}>
                <Download className="mr-1 h-4 w-4" /> Download
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

