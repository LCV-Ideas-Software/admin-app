export async function onRequestGet(context: any) {
  const keys = Object.keys(context.env)
  return new Response(JSON.stringify(keys, null, 2), { headers: { 'Content-Type': 'application/json' } })
}
