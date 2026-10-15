const DEFAULT_ORIGINS = [
  'https://williammcada.github.io',
  'https://vault7mathquest.netlify.app',
  'https://mcada-mathquest.onrender.com'
];
const METHODS = ['GET', 'POST'];
const HEADERS = ['content-type', 'accept','authorization','x-mathquest-teacher'];

function addVary(headers, names) {
  const existing = (headers.get('vary') || '').split(',').map(s => s.trim()).filter(Boolean);
  for (const name of names) if (!existing.some(s => s.toLowerCase() === name.toLowerCase())) existing.push(name);
  headers.set('vary', existing.join(', '));
}

// CORS permits the named browser origins; it does not replace session-key
// authorization. Apply this outside the Durable Object so errors and exports
// receive the same headers as successful commands and polling responses.
export async function withCors(request, env, handler, version) {
  const origin = request.headers.get('origin');
  const allowed = new Set(env.CORS_ALLOWED_ORIGINS === undefined
    ? DEFAULT_ORIGINS : env.CORS_ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean));
  const headers = new Headers({ 'cache-control': 'no-store', 'x-mathquest-version': version });
  addVary(headers, ['Origin']);
  if (origin && !allowed.has(origin) && origin !== new URL(request.url).origin) {
    return new Response(JSON.stringify({ error: 'This website is not allowed to access MathQuest.' }), {
      status: 403, headers: { ...Object.fromEntries(headers), 'content-type': 'application/json; charset=utf-8' }
    });
  }
  if (origin) {
    headers.set('access-control-allow-origin', origin);
    headers.set('access-control-expose-headers', 'Content-Disposition, X-MathQuest-Version');
  }
  if (request.method === 'OPTIONS') {
    addVary(headers, ['Access-Control-Request-Method', 'Access-Control-Request-Headers']);
    const method = request.headers.get('access-control-request-method');
    const requested = (request.headers.get('access-control-request-headers') || '')
      .toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
    if (!origin || !METHODS.includes(method) || requested.some(name => !HEADERS.includes(name))) {
      return new Response(null, { status: 403, headers });
    }
    headers.set('access-control-allow-methods', METHODS.join(', '));
    headers.set('access-control-allow-headers', HEADERS.join(', '));
    headers.set('access-control-max-age', '600');
    return new Response(null, { status: 204, headers });
  }
  let result;
  try {
    result = await handler();
  } catch (error) {
    console.error('MathQuest request failed:', error);
    result = new Response(JSON.stringify({ error: 'The session server could not complete this request. Please retry.' }), {
      status: 500, headers: { 'content-type': 'application/json; charset=utf-8' }
    });
  }
  const output = result.webSocket ? new Response(null,{status:101,webSocket:result.webSocket,headers:result.headers}) : new Response(result.body, result);
  // Never let a CDN cache student state, teacher exports, or an origin-specific response.
  for (const [key, value] of headers) if (key !== 'vary') output.headers.set(key, value);
  addVary(output.headers, ['Origin']);
  return output;
}
