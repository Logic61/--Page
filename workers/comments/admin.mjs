import { adminPage } from './admin-page.mjs';

const COOKIE = '__Secure-zhumen-admin';
const SESSION_SECONDS = 8 * 60 * 60;
const PAGE_SIZE = 30;
const SECRET = /^[a-f0-9]{64}$/;
const COOKIE_VALUE = /^(\d{1,12}\.[0-9a-f-]{36})\.([A-Za-z0-9_-]{43})$/;
const encoder = new TextEncoder();
const headers = {
  'Cache-Control': 'no-store',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex, nofollow',
};

function json(data, status = 200, extraHeaders = {}) {
  return Response.json(data, { status, headers: { ...headers, ...extraHeaders } });
}

function importKey(secret) {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

function setCookie(value, maxAge) {
  return `${COOKIE}=${value}; Path=/admin; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`;
}

async function signIn(request, signingKey) {
  const attempt = request.headers.get('Authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
  if (!attempt) return json({ error: 'unauthorized' }, 401);

  const proof = encoder.encode('zhumen-comments-admin-login');
  const attemptKey = await importKey(attempt);
  const signature = await crypto.subtle.sign('HMAC', attemptKey, proof);
  if (!await crypto.subtle.verify('HMAC', signingKey, signature, proof)) {
    return json({ error: 'unauthorized' }, 401);
  }

  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const payload = `${expires}.${crypto.randomUUID()}`;
  const mac = await crypto.subtle.sign('HMAC', signingKey, encoder.encode(payload));
  const encoded = btoa(String.fromCharCode(...new Uint8Array(mac))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return json({ ok: true }, 200, { 'Set-Cookie': setCookie(`${payload}.${encoded}`, SESSION_SECONDS) });
}

async function hasSession(request, signingKey) {
  const cookie = request.headers.get('Cookie')?.split(';').map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  const parsed = COOKIE_VALUE.exec(cookie ?? '');
  if (!parsed || Number(parsed[1].split('.')[0]) <= Math.floor(Date.now() / 1000)) return false;

  const [, payload, encoded] = parsed;
  const mac = Uint8Array.from(atob(encoded.replace(/-/g, '+').replace(/_/g, '/') + '='), (char) => char.charCodeAt(0));
  return crypto.subtle.verify('HMAC', signingKey, mac, encoder.encode(payload));
}

function positiveInteger(value) {
  return /^[1-9]\d*$/.test(value ?? '') && Number.isSafeInteger(Number(value));
}

async function list(db, before) {
  if (before !== null && !positiveInteger(before)) return json({ error: 'invalid' }, 400);

  const results = await db.batch([
    db.prepare('SELECT posting_enabled FROM comment_settings WHERE id = 1'),
    db.prepare(`
      SELECT id, page, name, body, hidden, created_at FROM comments
      WHERE id < ? AND page NOT GLOB '/miwen/deployment-check-*'
      ORDER BY id DESC LIMIT ?
    `).bind(before === null ? Number.MAX_SAFE_INTEGER : Number(before), PAGE_SIZE + 1),
  ]);
  const [{ posting_enabled }] = results[0].results;
  const rows = results[1].results;
  const comments = rows.slice(0, PAGE_SIZE);
  return json({
    comments,
    postingEnabled: posting_enabled === 1,
    next: rows.length > PAGE_SIZE ? comments.at(-1).id : null,
  });
}

async function changeVisibility(db, id, hidden) {
  if (!positiveInteger(id) || (hidden !== '0' && hidden !== '1')) return json({ error: 'invalid' }, 400);
  const result = await db.prepare('UPDATE comments SET hidden = ? WHERE id = ? RETURNING hidden')
    .bind(Number(hidden), Number(id)).first();
  return result ? json({ hidden: result.hidden === 1 }) : json({ error: 'not_found' }, 404);
}

async function changePosting(db, enabled) {
  if (enabled !== '0' && enabled !== '1') return json({ error: 'invalid' }, 400);
  const result = await db.prepare('UPDATE comment_settings SET posting_enabled = ? WHERE id = 1 RETURNING posting_enabled')
    .bind(Number(enabled)).first();
  return json({ postingEnabled: result.posting_enabled === 1 });
}

export async function handleAdmin(request, url, env) {
  const path = url.pathname.replace(/\/$/, '');
  const method = request.method;
  const configured = SECRET.test(env.COMMENTS_ADMIN_KEY ?? '');

  if (path === '/admin' && method === 'GET') {
    const nonce = crypto.randomUUID();
    return new Response(adminPage(nonce, configured), {
      headers: {
        ...headers,
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'`,
      },
    });
  }

  const origin = request.headers.get('Origin');
  if (origin !== url.origin && (origin !== null || method !== 'GET')) {
    return json({ error: 'forbidden' }, 403);
  }
  if (!configured) return json({ error: 'unavailable' }, 503);

  try {
    const signingKey = await importKey(env.COMMENTS_ADMIN_KEY);
    if (path === '/admin/session' && method === 'POST') return await signIn(request, signingKey);
    if (path === '/admin/session' && method === 'DELETE') {
      return json({ ok: true }, 200, { 'Set-Cookie': setCookie('', 0) });
    }
    if (!await hasSession(request, signingKey)) return json({ error: 'unauthorized' }, 401);

    if (path === '/admin/comments' && method === 'GET') return await list(env.DB, url.searchParams.get('before'));
    if (path === '/admin/posting' && method === 'PUT') return await changePosting(env.DB, url.searchParams.get('enabled'));

    const comment = /^\/admin\/comments\/([^/]+)$/.exec(path);
    if (comment && method === 'PUT') return await changeVisibility(env.DB, comment[1], url.searchParams.get('hidden'));
    return json({ error: 'not_found' }, 404);
  } catch {
    return json({ error: 'unavailable' }, 503);
  }
}
