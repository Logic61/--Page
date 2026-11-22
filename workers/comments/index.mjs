import { moderate } from './moderation.mjs';
import { handleAdmin } from './admin.mjs';

const PAGE = /^\/(?:changshi|(?:miwen|xianwen)(?:\/[a-z0-9-]{1,80})?|famen(?:\/(?:tixi|chuanshou))?|(?:aozhan|tongshen|oujing|shendao|zhenqi|zhuyanshu|zhoufa)\/jieshao)$/;
const SUBMISSION_ID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const PAGE_SIZE = 20;
const BODY_BYTES = 16 * 1024;
const MAX_REVIEWS_PER_MINUTE = 12;
const VISIBLE_REPLY_TARGET = `
  SELECT thread.id AS thread_id FROM comments AS target
  JOIN comments AS thread ON thread.id = COALESCE(target.thread_id, target.id)
  WHERE target.id = ? AND target.page = ? AND target.hidden = 0
    AND thread.page = target.page AND thread.hidden = 0 AND thread.thread_id IS NULL
`;

function positiveInteger(value) {
  return /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value));
}

function json(data, status, headers) {
  return Response.json(data, { status, headers });
}

async function readSubmission(request) {
  if (!request.body || Number(request.headers.get('Content-Length')) > BODY_BYTES) return null;
  const reader = request.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let bytes = 0;
  let text = '';

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > BODY_BYTES) {
        await reader.cancel();
        return null;
      }
      text += decoder.decode(value, { stream: true });
    }

    const { submissionId, name, body, website, parentId = null } = JSON.parse(text + decoder.decode());
    if (typeof submissionId !== 'string' || !SUBMISSION_ID.test(submissionId) || website !== '' ||
        typeof name !== 'string' || typeof body !== 'string' ||
        (parentId !== null && (!Number.isSafeInteger(parentId) || parentId <= 0))) return null;

    const cleanName = name.trim();
    const cleanBody = body.replace(/\r\n?/g, '\n').trim();
    if (cleanName.length > 32 || /[\p{Cc}\u202a-\u202e\u2066-\u2069]/u.test(cleanName) ||
        cleanBody.length > 1000 || !/[\p{L}\p{N}\p{P}\p{S}]/u.test(cleanBody) ||
        /[\x00-\x08\x0b-\x1f\x7f-\x9f\u202a-\u202e\u2066-\u2069]/u.test(cleanBody)) return null;
    return { submissionId, name: cleanName, body: cleanBody, parentId };
  } catch {
    await reader.cancel().catch(() => {});
    return null;
  }
}

async function listComments(url, page, db, headers) {
  const thread = url.searchParams.get('thread');
  if (thread !== null) return await listReplies(url, page, thread, db, headers);

  const before = url.searchParams.get('before');
  if (before !== null && !positiveInteger(before)) {
    return json({ error: 'invalid' }, 400, headers);
  }

  const { results } = await db.prepare(`
    SELECT thread.id, thread.name, thread.body, thread.created_at,
      (SELECT COUNT(*) FROM comments AS reply WHERE reply.thread_id = thread.id AND reply.hidden = 0) AS reply_count
    FROM comments AS thread
    WHERE thread.page = ? AND thread.hidden = 0 AND thread.thread_id IS NULL AND thread.id < ?
    ORDER BY thread.id DESC LIMIT ?
  `).bind(page, before === null ? Number.MAX_SAFE_INTEGER : Number(before), PAGE_SIZE + 1).all();
  const comments = results.slice(0, PAGE_SIZE);
  const next = results.length > PAGE_SIZE ? comments.at(-1).id : null;
  return json({ comments, next, threads: true }, 200, headers);
}

async function listReplies(url, page, thread, db, headers) {
  const after = url.searchParams.get('after');
  if (!positiveInteger(thread) || (after !== null && !positiveInteger(after))) {
    return json({ error: 'invalid' }, 400, headers);
  }

  const { results } = await db.prepare(`
    SELECT reply.id, reply.name, reply.body, reply.created_at, reply.parent_id, reply.thread_id,
      parent.name AS parent_name
    FROM comments AS reply
    JOIN comments AS thread ON thread.id = reply.thread_id AND thread.hidden = 0 AND thread.thread_id IS NULL
    LEFT JOIN comments AS parent ON parent.id = reply.parent_id AND parent.hidden = 0
    WHERE thread.page = ? AND reply.thread_id = ? AND reply.hidden = 0 AND reply.id > ?
    ORDER BY reply.id LIMIT ?
  `).bind(page, Number(thread), Number(after ?? 0), PAGE_SIZE + 1).all();
  const comments = results.slice(0, PAGE_SIZE);
  const next = results.length > PAGE_SIZE ? comments.at(-1).id : null;
  return json({ comments, next }, 200, headers);
}

async function publishComment(request, page, env, headers, isReply) {
  if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    return json({ error: 'invalid' }, 415, headers);
  }

  const submission = await readSubmission(request);
  if (!submission || (submission.parentId !== null) !== isReply) return json({ error: 'invalid' }, 400, headers);

  const { submissionId, name, body, parentId } = submission;
  const previous = env.DB.prepare(`
    SELECT saved.id, saved.page, saved.name, saved.body, saved.created_at, saved.parent_id, saved.thread_id,
      saved.hidden OR COALESCE(thread.hidden, 0) AS hidden, parent.name AS parent_name
    FROM comments AS saved
    LEFT JOIN comments AS thread ON thread.id = saved.thread_id
    LEFT JOIN comments AS parent ON parent.id = saved.parent_id AND parent.hidden = 0
    WHERE saved.submission_id = ?
  `).bind(submissionId);
  const existing = await previous.first();
  const respondWithExisting = (row) => {
    if (row.page !== page || row.name !== name || row.body !== body || row.parent_id !== parentId) {
      return json({ error: 'invalid' }, 409, headers);
    }
    if (row.hidden) return json({ error: 'hidden' }, 410, headers);
    const { id, created_at, parent_id, thread_id, parent_name } = row;
    return json({ comment: { id, name, body, created_at, parent_id, thread_id, parent_name }, threads: true }, 200, headers);
  };
  if (existing) return respondWithExisting(existing);

  const replyUnavailable = () => json({ error: 'reply_unavailable' }, 404, headers);
  const target = parentId === null ? null : await env.DB.prepare(VISIBLE_REPLY_TARGET).bind(parentId, page).first();
  if (parentId !== null && !target) return replyUnavailable();

  const paused = () => json({ error: 'paused' }, 503, headers);
  const settings = await env.DB.prepare('SELECT posting_enabled FROM comment_settings WHERE id = 1').first();
  if (!settings?.posting_enabled) return paused();
  if (!env.GLM_API_KEY && !env.AGNES_API_KEY) return json({ error: 'unavailable' }, 503, headers);

  const limited = () => json({ error: 'rate_limit' }, 429, { ...headers, 'Retry-After': '60' });
  const key = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (!(await env.POST_LIMIT.limit({ key })).success) return limited();

  // 由 D1 原子更新，避免不同 Cloudflare 节点独立消耗免费模型的调用额度。
  const minute = Math.floor(Date.now() / 60000);
  const quota = await env.DB.prepare(`
    INSERT INTO review_quota (id, minute, used) VALUES (1, ?, 1)
    ON CONFLICT (id) DO UPDATE SET
      used = CASE WHEN excluded.minute = review_quota.minute THEN review_quota.used + 1 ELSE 1 END,
      minute = excluded.minute
    WHERE excluded.minute > review_quota.minute
       OR (excluded.minute = review_quota.minute AND review_quota.used < ?)
  `).bind(minute, MAX_REVIEWS_PER_MINUTE).run();
  if (!quota.meta.changes) return limited();

  const verdict = await moderate(env, name, body);
  if (verdict === null) return json({ error: 'unavailable' }, 503, headers);
  if (verdict !== 'allow') return json({ error: 'content_violation' }, 422, headers);

  // The owner can pause posting or hide the reply target while review is in progress.
  const comment = await env.DB.prepare(`
    INSERT INTO comments (submission_id, page, name, body, created_at, parent_id, thread_id)
    SELECT ?, ?, ?, ?, ?, ?, ?
    WHERE EXISTS (SELECT 1 FROM comment_settings WHERE id = 1 AND posting_enabled = 1)
      AND (? IS NULL OR EXISTS (${VISIBLE_REPLY_TARGET}))
    ON CONFLICT (submission_id) DO NOTHING
    RETURNING id, name, body, created_at, parent_id, thread_id
  `).bind(submissionId, page, name, body, new Date().toISOString(), parentId, target?.thread_id ?? null,
    parentId, parentId, page).first();
  if (comment) return json({ comment, threads: true }, 201, headers);

  const concurrent = await previous.first();
  if (concurrent) return respondWithExisting(concurrent);
  if (parentId !== null && !await env.DB.prepare(VISIBLE_REPLY_TARGET).bind(parentId, page).first()) {
    return replyUnavailable();
  }
  return paused();
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/admin' || url.pathname.startsWith('/admin/')) {
      return handleAdmin(request, url, env);
    }
    const origin = request.headers.get('Origin');
    const isReply = url.pathname === '/comments/replies';
    const headers = {
      'Cache-Control': 'no-store',
      Vary: 'Origin',
      'X-Content-Type-Options': 'nosniff',
    };
    if (origin && origin === env.SITE_ORIGIN) headers['Access-Control-Allow-Origin'] = origin;
    if (url.pathname !== '/comments' && !isReply) return json({ error: 'not_found' }, 404, headers);
    if ((origin || request.method !== 'GET') && !headers['Access-Control-Allow-Origin']) {
      return json({ error: 'forbidden' }, 403, headers);
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: { ...headers, 'Access-Control-Allow-Methods': isReply ? 'POST, OPTIONS' : 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' },
      });
    }
    if (request.method !== 'POST' && (request.method !== 'GET' || isReply)) {
      return json({ error: 'method' }, 405, { ...headers, Allow: isReply ? 'POST, OPTIONS' : 'GET, POST, OPTIONS' });
    }

    const page = url.searchParams.get('page');
    if (!page || !PAGE.test(page)) return json({ error: 'invalid' }, 400, headers);
    try {
      if (request.method === 'GET') return await listComments(url, page, env.DB, headers);
      return await publishComment(request, page, env, headers, isReply);
    } catch {
      console.warn('Comment database or rate limiter unavailable', { method: request.method });
      return json({ error: 'unavailable' }, 503, headers);
    }
  },
};
