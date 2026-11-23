import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { buildManifest, makeFrontmatter, postsDir, slugify } from './scripts/post-utils.mjs';

const MAX_BODY_BYTES = 100_000;

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}

function isLoopback(req) {
  const address = req.socket.remoteAddress || '';
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1';
}

function isLocalBind() {
  const bind = process.env.HOST || '127.0.0.1';
  return ['127.0.0.1', 'localhost', '::1', '[::1]'].includes(bind);
}

function validOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const url = new URL(origin);
    return ['127.0.0.1', 'localhost', '::1', '[::1]'].includes(url.hostname);
  } catch {
    return false;
  }
}

async function uniqueSlug(base) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const slug = attempt === 0 ? base : `${base}-${attempt + 1}`;
    try {
      await writeFile(path.join(postsDir, `${slug}.md`), '', { flag: 'wx' });
      return slug;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
  }
  throw new Error('同名日志过多，请换一个标题。');
}

export async function handleBlogApi(req, res, pathname) {
  if (pathname !== '/api/posts') {
    json(res, 404, { error: '接口不存在。' });
    return;
  }
  if (req.method !== 'POST') {
    json(res, 405, { error: '请使用 POST。' });
    return;
  }
  if (!isLocalBind() || !isLoopback(req)) {
    json(res, 403, { error: '写日志接口只允许本机使用。线上请下载 Markdown 后提交到 GitHub。' });
    return;
  }
  if (!validOrigin(req)) {
    json(res, 403, { error: '不接受来自其他站点的写入请求。' });
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
      if (bytes > MAX_BODY_BYTES) {
        json(res, 413, { error: '日志太长，请分成多篇。' });
        return;
      }
    }
    body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    json(res, 400, { error: '请求格式不正确。' });
    return;
  }

  const title = typeof body?.title === 'string' ? body.title.trim().replace(/[\r\n]+/g, ' ') : '';
  const text = typeof body?.body === 'string' ? body.body.trim() : '';
  const summary = typeof body?.summary === 'string' ? body.summary.trim().replace(/[\r\n]+/g, ' ') : '';
  const date = typeof body?.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date)
    ? body.date
    : new Date().toISOString().slice(0, 10);
  const tags = Array.isArray(body?.tags)
    ? body.tags.map((tag) => String(tag).trim().replace(/[\r\n]/g, ' ')).filter(Boolean).slice(0, 10)
    : [];

  if (!title || !text) {
    json(res, 400, { error: '标题和正文不能为空。' });
    return;
  }
  if (title.length > 100 || text.length > 20_000 || summary.length > 160) {
    json(res, 400, { error: '标题、摘要或正文超过长度限制。' });
    return;
  }

  const base = `${date}-${slugify(title) || 'post'}`;
  try {
    const slug = await uniqueSlug(base);
    const content = `${makeFrontmatter({ title, date, tags, summary })}\n${text}\n`;
    await writeFile(path.join(postsDir, `${slug}.md`), content, 'utf8');
    await buildManifest();
    json(res, 201, { slug, url: `/blog.html#post/${encodeURIComponent(slug)}` });
  } catch (error) {
    json(res, 500, { error: `写入失败：${error.message}` });
  }
}
