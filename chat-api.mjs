const topics = { coffee: 'casual daily life', makers: 'Arduino, electronics and creative projects', exchange: 'language learning and cultural exchange' };
let busy = false;
const hits = new Map();
const WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT = Math.max(1, Number(process.env.CHAT_RATE_LIMIT || 30));

function config() {
  const { CHAT_API_URL: endpoint, CHAT_API_KEY: key, CHAT_MODEL: model } = process.env;
  if (!endpoint || !key || !model) return null;
  try {
    const url = new URL(endpoint);
    if (url.username || url.password || url.search || url.hash) return null;
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname))) return null;
    return { endpoint, key, model, deepseek: url.hostname === 'api.deepseek.com' || process.env.CHAT_PROVIDER === 'deepseek' };
  } catch {
    return null;
  }
}

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}

function configuredOrigins() {
  return String(process.env.PUBLIC_ORIGIN || process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

function originAllowed(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const originUrl = new URL(origin);
    if (configuredOrigins().includes(originUrl.origin)) return true;
    if (originUrl.hostname === '127.0.0.1' || originUrl.hostname === 'localhost' || originUrl.hostname === '::1') return true;
    return Boolean(req.headers.host && originUrl.host === req.headers.host);
  } catch {
    return false;
  }
}

function applyCors(req, res) {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Vary', 'Origin');
  }
}

function clientKey(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress || 'unknown';
}

function isRateLimited(req) {
  const now = Date.now();
  const key = clientKey(req);
  const recent = (hits.get(key) || []).filter((time) => now - time < WINDOW_MS);
  if (recent.length >= RATE_LIMIT) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 2000) {
    for (const [entryKey, times] of hits) {
      if (!times.length || now - times[times.length - 1] >= WINDOW_MS) hits.delete(entryKey);
    }
  }
  return false;
}

export async function handleChat(req, res, pathname) {
  if (!originAllowed(req)) {
    json(res, 403, { error: '不接受跨站请求。' });
    return;
  }
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (pathname === '/api/status' && req.method === 'GET') {
    json(res, 200, { configured: Boolean(config()) });
    return;
  }
  if (pathname === '/api/report') {
    await handleReport(req, res);
    return;
  }
  if (pathname !== '/api/chat') {
    json(res, 404, { error: '接口不存在。' });
    return;
  }
  if (req.method !== 'POST') {
    json(res, 405, { error: '请使用 POST。' });
    return;
  }
  if (!req.headers['content-type']?.startsWith('application/json')) {
    json(res, 415, { error: '请使用 JSON 请求。' });
    return;
  }

  let body;
  try {
    const chunks = [];
    let bytes = 0;
    for await (const chunk of req) {
      chunks.push(chunk);
      bytes += chunk.length;
      if (bytes > 48000) {
        json(res, 413, { error: '对话内容过长，请开启新对话。' });
        return;
      }
    }
    body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    json(res, 400, { error: '请求格式不正确。' });
    return;
  }

  if (!body || !Object.hasOwn(topics, body.room) || !Array.isArray(body.messages) || !body.messages.length || body.messages.length > 20 || body.messages.some((m) => !m || !['user', 'assistant'].includes(m.role) || typeof m.content !== 'string' || !m.content.trim() || m.content.length > 4000) || body.messages.at(-1).role !== 'user') {
    json(res, 400, { error: '请提供有效的频道和对话内容。' });
    return;
  }

  const settings = config();
  if (!settings) {
    json(res, 503, { error: '尚未配置 API。请在本地 .env 中设置接口地址、密钥和模型，然后重启服务。' });
    return;
  }
  if (isRateLimited(req)) {
    res.setHeader('Retry-After', '3600');
    json(res, 429, { error: '这个网络今天说得有点多，休息一会儿再来吧。' });
    return;
  }
  if (busy) {
    json(res, 429, { error: '正在处理上一条消息，请稍后再试。' });
    return;
  }

  busy = true;
  try {
    const response = await fetch(settings.endpoint, {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(30000),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.key}` },
      body: JSON.stringify({
        model: settings.model,
        stream: false,
        max_tokens: 500,
        ...(settings.deepseek ? { thinking: { type: 'disabled' } } : {}),
        messages: [
          {
            role: 'system',
            content: `You are an AI English conversation partner in a warm, welcoming salon. Never claim to be human, a real native speaker, a person shown in any portrait, or someone from the user's personal life. The illustrated host is only a visual character. Topic: ${topics[body.room]}. Respond naturally, usually in 2-5 sentences, and ask one thoughtful follow-up question. Adapt to the user's English level. Offer at most one gentle correction when useful without interrupting the conversation. Explain in Chinese if requested. Do not pretend to have performed actions outside the conversation.`
          },
          ...body.messages.map(({ role, content }) => ({ role, content }))
        ]
      })
    });
    if (!response.ok) {
      json(res, 502, {
        error: response.status === 401 || response.status === 403
          ? '服务商拒绝认证，请检查本地密钥与权限。'
          : response.status === 429
            ? '服务商额度或请求频率受限，请稍后重试。'
            : '服务商暂时未能完成请求，请检查接口和模型配置。'
      });
      return;
    }
    const result = await response.json();
    const answer = result?.choices?.[0]?.message?.content;
    if (typeof answer !== 'string' || !answer.trim()) {
      json(res, 502, { error: '接口返回格式不兼容：需要 Chat Completions 格式的文本回复。' });
      return;
    }
    json(res, 200, { reply: answer.slice(0, 12000) });
  } catch (error) {
    json(res, 502, { error: error.name === 'TimeoutError' ? '回复超时，请稍后重试。' : '无法连接服务商，请检查地址与网络。' });
  } finally {
    busy = false;
  }
}

async function handleReport(req, res) {
  if (req.method !== 'POST') {
    json(res, 405, { error: '请使用 POST。' });
    return;
  }
  if (!req.headers['content-type']?.startsWith('application/json')) {
    json(res, 415, { error: '请使用 JSON 请求。' });
    return;
  }

  let body;
  try {
    const chunks = [];
    let bytes = 0;
    for await (const chunk of req) {
      chunks.push(chunk);
      bytes += chunk.length;
      if (bytes > 48000) {
        json(res, 413, { error: '对话内容过长，无法生成报告。' });
        return;
      }
    }
    body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    json(res, 400, { error: '请求格式不正确。' });
    return;
  }

  const history = body?.messages;
  if (!body || !Object.hasOwn(topics, body.room) || !Array.isArray(history) || history.length < 2 || history.length > 20 || history.some((message) => !message || !['user', 'assistant'].includes(message.role) || typeof message.content !== 'string' || !message.content.trim() || message.content.length > 4000) || !history.some((message) => message.role === 'assistant')) {
    json(res, 400, { error: '请提供一段包含 AI 回复的对话。' });
    return;
  }

  const settings = config();
  if (!settings) {
    json(res, 503, { error: '尚未配置 API。请在本地 .env 中设置接口地址、密钥和模型，然后重启服务。' });
    return;
  }
  if (isRateLimited(req)) {
    res.setHeader('Retry-After', '3600');
    json(res, 429, { error: '这个网络今天说得有点多，休息一会儿再来吧。' });
    return;
  }
  if (busy) {
    json(res, 429, { error: '正在处理上一条消息，请稍后再试。' });
    return;
  }

  busy = true;
  try {
    const reportSystem = `You are an English practice coach reviewing a short conversation in a warm language salon. Write a compact practice report in Chinese, under 230 Chinese characters. Use exactly four short parts with these labels on separate lines: 这次聊了、做得好的、可以更自然、下一轮建议. In "可以更自然", quote at most one short original sentence and offer a natural rewrite. Be encouraging, concrete and honest. Do not invent facts, do not claim to be human, and do not add extra sections. Topic: ${topics[body.room]}.`;
    const reportInstruction = {
      role: 'user',
      content: '请根据上面的对话生成这份简短的中文练习报告。'
    };
    const response = await fetch(settings.endpoint, {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(30000),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.key}` },
      body: JSON.stringify({
        model: settings.model,
        stream: false,
        temperature: 0.4,
        max_tokens: 650,
        ...(settings.deepseek ? { thinking: { type: 'disabled' } } : {}),
        messages: [
          { role: 'system', content: reportSystem },
          ...history.map(({ role, content }) => ({ role, content })),
          reportInstruction
        ]
      })
    });
    if (!response.ok) {
      json(res, 502, {
        error: response.status === 401 || response.status === 403
          ? '服务商拒绝认证，请检查密钥与权限。'
          : response.status === 429
            ? '服务商额度或请求频率受限，请稍后重试。'
            : '服务商暂时未能生成报告，请检查接口和模型配置。'
      });
      return;
    }
    const result = await response.json();
    const report = result?.choices?.[0]?.message?.content;
    if (typeof report !== 'string' || !report.trim()) {
      json(res, 502, { error: '报告返回格式不兼容。' });
      return;
    }
    json(res, 200, { report: report.trim().slice(0, 6000) });
  } catch (error) {
    json(res, 502, { error: error.name === 'TimeoutError' ? '报告生成超时，请稍后重试。' : '无法连接服务商，请检查地址与网络。' });
  } finally {
    busy = false;
  }
}
