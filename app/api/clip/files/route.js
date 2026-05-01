export const runtime = 'edge';

/**
 * Clip Files API — CRUD for browser-persisted file metadata.
 * Actual files live in IndexedDB on the client; this endpoint
 * proxies/validates operations for sync or server-side features.
 */

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  switch (action) {
    case 'stats': {
      return Response.json({ ok: true, data: { maxFiles: 1000, maxSizeBytes: 100 * 1024 * 1024, retentionDays: 90 } });
    }
    case 'export': {
      // Returns a zip manifest for client-side zip generation
      return Response.json({ ok: true, data: { message: 'Use client-side IndexedDB for bulk export.' } });
    }
    default:
      return Response.json({ ok: true, data: { message: 'Client-side IndexedDB is the source of truth. Use lib/clipStorage.js directly.' } });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, fileId, shareConfig } = body;

    if (action === 'share') {
      // Generate a share token (server-side only; client handles actual blob)
      const token = `share_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      return Response.json({ ok: true, data: { token, url: `/api/clip/files?token=${token}`, expiresIn: '24h' } });
    }

    if (action === 'validate') {
      const { name, size } = body;
      if (size > 100 * 1024 * 1024) {
        return Response.json({ ok: false, error: 'File exceeds 100MB limit.' }, { status: 413 });
      }
      return Response.json({ ok: true, data: { valid: true } });
    }

    return Response.json({ ok: false, error: 'Unknown action.' }, { status: 400 });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 400 });
  }
}

export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return Response.json({ ok: false, error: 'Missing id.' }, { status: 400 });
  return Response.json({ ok: true, data: { deleted: id, message: 'Client-side delete confirmed.' } });
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { id, patch } = body;
    if (!id) return Response.json({ ok: false, error: 'Missing id.' }, { status: 400 });
    return Response.json({ ok: true, data: { updated: id, patch } });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 400 });
  }
}
