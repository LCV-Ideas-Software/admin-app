export async function onRequestGet() {
  return new Response(JSON.stringify({
    ok: true,
    app: 'admin-app',
    version: 'APP v01.30.01',
    phase: 'fase-1-shell',
    timestamp: new Date().toISOString(),
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  })
}