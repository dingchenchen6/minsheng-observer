const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store'
};

const SECURITY_HEADERS = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'strict-origin-when-cross-origin'
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const requestId = crypto.randomUUID();
    const headers = buildHeaders(request, env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    try {
      if (url.pathname === '/health') {
        return json({ ok: true, service: env.APP_NAME || 'live-backend', request_id: requestId }, 200, headers);
      }

      if (url.pathname === '/public/live-state' && request.method === 'GET') {
        const payload = await getLiveState(env);
        return json({ ...payload, request_id: requestId }, 200, headers);
      }

      if (url.pathname === '/auth/wechat/start' && request.method === 'GET') {
        return startWechatAuth(url, env, headers);
      }

      if (url.pathname === '/auth/wechat/callback' && request.method === 'GET') {
        return json({
          ok: false,
          request_id: requestId,
          message: '请在此处接入微信 code 换 token 与会话签发逻辑。'
        }, 501, headers);
      }

      if (url.pathname === '/vote' && request.method === 'POST') {
        return await handleVote(request, env, headers, requestId, ctx);
      }

      if (url.pathname === '/comment' && request.method === 'POST') {
        return await handleComment(request, env, headers, requestId, ctx);
      }

      if (url.pathname === '/bullet' && request.method === 'POST') {
        return await handleBullet(request, env, headers, requestId, ctx);
      }

      return json({ ok: false, request_id: requestId, error: 'not_found' }, 404, headers);
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      const code = error instanceof HttpError ? error.message : 'internal_error';
      return json({ ok: false, request_id: requestId, error: code, message: error.message }, status, headers);
    }
  }
};

function buildHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowedOrigin = env.ALLOWED_ORIGIN || 'https://dingchenchen6.github.io';
  const headers = new Headers({ ...JSON_HEADERS, ...SECURITY_HEADERS });
  if (!origin || origin === allowedOrigin) {
    headers.set('access-control-allow-origin', allowedOrigin);
  }
  headers.set('access-control-allow-methods', 'GET,POST,OPTIONS');
  headers.set('access-control-allow-headers', 'Content-Type, Authorization');
  headers.set('vary', 'Origin');
  return headers;
}

function json(payload, status, headers) {
  return new Response(JSON.stringify(payload, null, 2), { status, headers });
}

function startWechatAuth(url, env, headers) {
  if (!env.WECHAT_APP_ID || !env.WECHAT_REDIRECT_URI) {
    return json({ ok: false, error: 'wechat_not_configured' }, 503, headers);
  }
  const state = crypto.randomUUID();
  const target = new URL('https://open.weixin.qq.com/connect/qrconnect');
  target.searchParams.set('appid', env.WECHAT_APP_ID);
  target.searchParams.set('redirect_uri', env.WECHAT_REDIRECT_URI);
  target.searchParams.set('response_type', 'code');
  target.searchParams.set('scope', 'snsapi_login');
  target.searchParams.set('state', state);
  return Response.redirect(target.toString(), 302);
}

async function handleVote(request, env, headers, requestId, ctx) {
  const session = await requireSession(request, env);
  const body = await parseJson(request);
  ensureString(body.poll_id, 64, 'poll_id');
  ensureString(body.option_id, 32, 'option_id');
  ensureString(body.topic, 32, 'topic');

  await enforceRateLimit(env, session.user_id, request, 'vote', 8, 60);

  const now = new Date().toISOString();
  const ipHash = await hashText(clientIp(request));
  const voteId = crypto.randomUUID();

  const existing = await env.DB.prepare(
    'SELECT id FROM poll_votes WHERE poll_id = ?1 AND user_id = ?2 LIMIT 1'
  ).bind(body.poll_id, session.user_id).first();
  if (existing) {
    await writeAudit(env, requestId, session.user_id, 'vote', 'duplicate_vote', ipHash, request);
    return json({ ok: false, request_id: requestId, error: 'duplicate_vote' }, 409, headers);
  }

  await env.DB.prepare(
    'INSERT INTO poll_votes (id, poll_id, option_id, topic, user_id, ip_hash, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)'
  ).bind(voteId, body.poll_id, body.option_id, body.topic, session.user_id, ipHash, now).run();
  await writeAudit(env, requestId, session.user_id, 'vote', 'accepted', ipHash, request);
  ctx.waitUntil(Promise.resolve());
  return json({ ok: true, request_id: requestId, vote_id: voteId }, 200, headers);
}

async function handleComment(request, env, headers, requestId, ctx) {
  const session = await requireSession(request, env);
  const body = await parseJson(request);
  ensureString(body.topic, 32, 'topic');
  ensureString(body.content, 400, 'content');

  await enforceRateLimit(env, session.user_id, request, 'comment', 4, 60);

  const riskScore = scoreTextRisk(body.content);
  const reviewStatus = riskScore >= 2 ? 'pending' : 'approved';
  const now = new Date().toISOString();
  const ipHash = await hashText(clientIp(request));
  const commentId = crypto.randomUUID();

  await env.DB.prepare(
    'INSERT INTO comments (id, topic, content, display_name, user_id, review_status, risk_score, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)'
  ).bind(commentId, body.topic, body.content.trim(), body.display_name || '匿名用户', session.user_id, reviewStatus, riskScore, now).run();
  await writeAudit(env, requestId, session.user_id, 'comment', reviewStatus, ipHash, request);
  ctx.waitUntil(Promise.resolve());
  return json({ ok: true, request_id: requestId, comment_id: commentId, review_status: reviewStatus }, 200, headers);
}

async function handleBullet(request, env, headers, requestId, ctx) {
  const session = await requireSession(request, env);
  const body = await parseJson(request);
  ensureString(body.topic, 32, 'topic');
  ensureString(body.excerpt, 80, 'excerpt');

  await enforceRateLimit(env, session.user_id, request, 'bullet', 6, 60);

  const riskScore = scoreTextRisk(body.excerpt);
  const reviewStatus = riskScore >= 2 ? 'pending' : 'approved';
  const now = new Date().toISOString();
  const ipHash = await hashText(clientIp(request));
  const bulletId = crypto.randomUUID();

  await env.DB.prepare(
    'INSERT INTO bullets (id, topic, excerpt, user_id, review_status, risk_score, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)'
  ).bind(bulletId, body.topic, body.excerpt.trim(), session.user_id, reviewStatus, riskScore, now).run();
  await writeAudit(env, requestId, session.user_id, 'bullet', reviewStatus, ipHash, request);
  ctx.waitUntil(Promise.resolve());
  return json({ ok: true, request_id: requestId, bullet_id: bulletId, review_status: reviewStatus }, 200, headers);
}

async function getLiveState(env) {
  const pollRows = await env.DB.prepare(
    'SELECT poll_id, option_id, COUNT(*) AS votes FROM poll_votes GROUP BY poll_id, option_id'
  ).all();
  const commentRows = await env.DB.prepare(
    "SELECT id, topic, content, display_name, created_at FROM comments WHERE review_status = 'approved' ORDER BY created_at DESC LIMIT 20"
  ).all();
  const bulletRows = await env.DB.prepare(
    "SELECT id, topic, excerpt, created_at FROM bullets WHERE review_status = 'approved' ORDER BY created_at DESC LIMIT 20"
  ).all();

  const pollTotals = {};
  for (const row of pollRows.results || []) {
    pollTotals[row.poll_id] = pollTotals[row.poll_id] || {};
    pollTotals[row.poll_id][row.option_id] = Number(row.votes || 0);
  }

  return {
    poll_totals: pollTotals,
    comments: (commentRows.results || []).map((row) => ({
      id: row.id,
      topic: row.topic,
      content: row.content,
      display_name: row.display_name,
      created_at: row.created_at
    })),
    bullets: (bulletRows.results || []).map((row) => ({
      id: row.id,
      topic: row.topic,
      excerpt: row.excerpt,
      created_at: row.created_at
    })),
    user: null
  };
}

async function requireSession(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) throw new HttpError('missing_session', 401);
  const tokenHash = await hashText(token + (env.SESSION_SECRET || ''));
  const row = await env.DB.prepare(
    'SELECT user_id, expires_at FROM sessions WHERE session_hash = ?1 LIMIT 1'
  ).bind(tokenHash).first();
  if (!row) throw new HttpError('invalid_session', 401);
  if (new Date(row.expires_at).getTime() < Date.now()) throw new HttpError('expired_session', 401);
  return { user_id: row.user_id };
}

async function enforceRateLimit(env, userId, request, scope, limit, windowSeconds) {
  if (!env.RATE_LIMIT_KV) return;
  const ip = clientIp(request);
  const minuteSlot = Math.floor(Date.now() / (windowSeconds * 1000));
  const key = `${scope}:${userId}:${ip}:${minuteSlot}`;
  const current = Number(await env.RATE_LIMIT_KV.get(key) || '0');
  if (current >= limit) throw new HttpError('rate_limited', 429);
  await env.RATE_LIMIT_KV.put(key, String(current + 1), { expirationTtl: windowSeconds + 5 });
}

async function writeAudit(env, requestId, userId, action, result, ipHash, request) {
  const uaHash = await hashText(request.headers.get('User-Agent') || '');
  await env.DB.prepare(
    'INSERT INTO audit_logs (id, request_id, user_id, action, result, ip_hash, ua_hash, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)'
  ).bind(crypto.randomUUID(), requestId, userId || null, action, result, ipHash || null, uaHash, new Date().toISOString()).run();
}

function clientIp(request) {
  return request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || '0.0.0.0';
}

function ensureString(value, maxLength, field) {
  if (typeof value !== 'string') throw new HttpError(`invalid_${field}`, 400);
  const next = value.trim();
  if (!next || next.length > maxLength) throw new HttpError(`invalid_${field}`, 400);
}

function scoreTextRisk(text) {
  const value = String(text || '').toLowerCase();
  const patterns = ['微信', '加群', '转账', '二维码', '红包', '兼职', '返现', '内幕', '保过', '保录', '培训贷'];
  return patterns.reduce((score, keyword) => score + (value.includes(keyword.toLowerCase()) ? 1 : 0), 0);
}

async function parseJson(request) {
  try {
    return await request.json();
  } catch {
    throw new HttpError('invalid_json', 400);
  }
}

async function hashText(value) {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

class HttpError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}
