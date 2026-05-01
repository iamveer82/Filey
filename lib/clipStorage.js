'use client';

/**
 * Filey Clip File Storage — Browser-only IndexedDB-backed file manager.
 *
 * Stores file *metadata* (name, type, category, createdAt, tool used, etc.)
 * and a reference to regenerate the file. Actual PDF bytes are ephemeral;
 * we store enough state to re-run the tool and re-download.
 *
 * Categories / Folders:
 *   - Built-in: "All", "Receipts", "Invoices", "PDFs", "Scans"
 *   - User-created folders appear as categories
 */

const DB_NAME = 'filey_clip_db';
const DB_VERSION = 2;
const STORE_FILES = 'files';
const STORE_FOLDERS = 'folders';

let _db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (_db) return resolve(_db);
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => { _db = req.result; resolve(_db); };
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_FILES)) {
        const fStore = db.createObjectStore(STORE_FILES, { keyPath: 'id', autoIncrement: true });
        fStore.createIndex('category', 'category', { unique: false });
        fStore.createIndex('createdAt', 'createdAt', { unique: false });
        fStore.createIndex('tool', 'tool', { unique: false });
      }
      // Migrate: add blob support if store exists from v1
      if (e.oldVersion < 2 && db.objectStoreNames.contains(STORE_FILES)) {
        const tx = e.target.transaction;
        const fStore = tx.objectStore(STORE_FILES);
        if (!fStore.indexNames.contains('tool')) fStore.createIndex('tool', 'tool', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_FOLDERS)) {
        db.createObjectStore(STORE_FOLDERS, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

/* ─── Files ─────────────────────────────────────────────── */

export async function listFiles(category = null) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FILES, 'readonly');
    const store = tx.objectStore(STORE_FILES);
    let req;
    if (category && category !== 'All') {
      req = store.index('category').openCursor(category);
    } else {
      req = store.openCursor();
    }
    const out = [];
    req.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) { out.push(cursor.value); cursor.continue(); }
      else resolve(out.sort((a, b) => b.createdAt - a.createdAt));
    };
    req.onerror = () => reject(req.error);
  });
}

export async function addFile(file, blob = null) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FILES, 'readwrite');
    const store = tx.objectStore(STORE_FILES);
    const payload = {
      ...file,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    if (blob) payload._blob = blob;
    const req = store.add(payload);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getFileBlob(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FILES, 'readonly');
    const store = tx.objectStore(STORE_FILES);
    const req = store.get(id);
    req.onsuccess = () => {
      const r = req.result;
      resolve(r?._blob || null);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getFileBlobUrl(id) {
  const blob = await getFileBlob(id);
  if (!blob) return null;
  return URL.createObjectURL(blob);
}

export async function updateFile(id, patch) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FILES, 'readwrite');
    const store = tx.objectStore(STORE_FILES);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const existing = getReq.result;
      if (!existing) return reject(new Error('File not found'));
      const updated = { ...existing, ...patch, updatedAt: Date.now() };
      const putReq = store.put(updated);
      putReq.onsuccess = () => resolve(updated);
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

export async function deleteFile(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FILES, 'readwrite');
    const store = tx.objectStore(STORE_FILES);
    const req = store.delete(id);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

export async function moveFileToFolder(fileId, folderId) {
  return updateFile(fileId, { category: folderId });
}

export async function searchFiles(query) {
  const all = await listFiles('All');
  const q = query.toLowerCase();
  return all.filter(f =>
    f.name?.toLowerCase().includes(q) ||
    f.tool?.toLowerCase().includes(q) ||
    f.category?.toLowerCase().includes(q)
  );
}

/* ─── Folders / Categories ────────────────────────────── */

const DEFAULT_FOLDERS = [
  { id: 'Receipts', name: 'Receipts', icon: 'Receipt', builtIn: true },
  { id: 'Invoices', name: 'Invoices', icon: 'FileText', builtIn: true },
  { id: 'PDFs',     name: 'PDFs',     icon: 'File', builtIn: true },
  { id: 'Scans',    name: 'Scans',    icon: 'Scan', builtIn: true },
];

export async function listFolders() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FOLDERS, 'readonly');
    const store = tx.objectStore(STORE_FOLDERS);
    const req = store.openCursor();
    const out = [...DEFAULT_FOLDERS];
    req.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) { out.push(cursor.value); cursor.continue(); }
      else resolve(out);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function createFolder(name) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FOLDERS, 'readwrite');
    const store = tx.objectStore(STORE_FOLDERS);
    const payload = { name, createdAt: Date.now(), builtIn: false };
    const req = store.add(payload);
    req.onsuccess = () => resolve({ ...payload, id: req.result });
    req.onerror = () => reject(req.error);
  });
}

export async function deleteFolder(id) {
  // Move all files in this folder to "All" (uncategorized)
  const files = await listFiles(id);
  await Promise.all(files.map(f => moveFileToFolder(f.id, 'All')));
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FOLDERS, 'readwrite');
    const store = tx.objectStore(STORE_FOLDERS);
    const req = store.delete(id);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

/* ─── Stats ───────────────────────────────────────────── */

export async function getFileStats() {
  const all = await listFiles('All');
  const byTool = {};
  const byCategory = {};
  all.forEach(f => {
    byTool[f.tool] = (byTool[f.tool] || 0) + 1;
    byCategory[f.category || 'All'] = (byCategory[f.category || 'All'] || 0) + 1;
  });
  return { total: all.length, byTool, byCategory, recent: all.slice(0, 5) };
}
