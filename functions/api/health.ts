export async function onRequestGet() {
  return new Response(JSON.stringify({
    ok: true,
    app: 'admin-app',
    version: 'APP v01.78.04',
    phase: 'motor-consolidado',
    timestamp: new Date().toISOString(),
  }), {
    headers: {
      'Content-Type': 'application/json',
    },
  })
}
