'use client';

/**
 * Root-layout-level error boundary. Renders its own <html>/<body>
 * because the regular layout failed to mount.
 */
export default function GlobalError({ error, reset }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif', background: '#F8FAFC', color: '#0F172A' }}>
        <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div style={{ maxWidth: 480, width: '100%', padding: '2rem', borderRadius: 24, background: 'white', border: '1px solid #E2E8F0', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.06)' }}>
            <div style={{ width: 64, height: 64, margin: '0 auto', borderRadius: 20, background: 'linear-gradient(135deg, #2A63E2, #1E4BB0)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 28, fontWeight: 700 }}>!</div>
            <h1 style={{ marginTop: 20, fontSize: 22, fontWeight: 700 }}>Filey hit a fatal error</h1>
            <p style={{ marginTop: 8, fontSize: 14, color: '#64748B' }}>Your data is safe — it lives in this browser. Try reloading.</p>
            {error?.digest && <p style={{ marginTop: 4, fontSize: 11, color: '#94A3B8' }}>ref: {error.digest}</p>}
            <button
              onClick={() => reset?.()}
              style={{ marginTop: 24, padding: '10px 18px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #2A63E2, #1E4BB0)', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
            >
              Reload app
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
