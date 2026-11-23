import http from 'node:http';
import { handleGuestbook } from './guestbook-api.mjs';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { handleChat } from './chat-api.mjs';
import { handleBlogApi } from './blog-api.mjs';
import { postsDir } from './scripts/post-utils.mjs';

try {
  process.loadEnvFile(new URL('.env', import.meta.url));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

const files = new Map([
  ['/orbit.css', ['orbit.css', 'text/css; charset=utf-8']],
  ['/salon.css', ['salon.css', 'text/css; charset=utf-8']],
  ['/assets/spark-space-reference.jpg', ['assets/spark-space-reference.jpg', 'image/jpeg']],
  ['/assets/earth-blue-marble.jpg', ['assets/earth-blue-marble.jpg', 'image/jpeg']],
  ['/assets/neon-workshop-bg.jpg', ['assets/neon-workshop-bg.jpg', 'image/jpeg']],
  ['/spark.css', ['spark.css', 'text/css; charset=utf-8']],
  ['/planet.js', ['planet.js', 'text/javascript; charset=utf-8']],
  ['/resources.js', ['resources.js', 'text/javascript; charset=utf-8']],
  ['/guestbook.js', ['guestbook.js', 'text/javascript; charset=utf-8']],
  ['/data/resources.json', ['data/resources.json', 'application/json; charset=utf-8']],
  ['/learning.css', ['learning.css', 'text/css; charset=utf-8']],
  ['/learning.js', ['learning.js', 'text/javascript; charset=utf-8']],
  ['/ambient.css', ['ambient.css', 'text/css; charset=utf-8']],
  ['/blog.css', ['blog.css', 'text/css; charset=utf-8']],
  ['/blog.js', ['blog.js', 'text/javascript; charset=utf-8']],
  ['/arduino-viewer.html', ['arduino-viewer.html', 'text/html; charset=utf-8']],
  ['/arduino-viewer.css', ['arduino-viewer.css', 'text/css; charset=utf-8']],
  ['/arduino-viewer.js', ['arduino-viewer.js', 'text/javascript; charset=utf-8']],
  ['/blog.html', ['blog.html', 'text/html; charset=utf-8']],
  ['/assets/salon-host-v5.png', ['assets/salon-host-v5.png', 'image/png']],
  ['/assets/engineering-studio-v5.png', ['assets/engineering-studio-v5.png', 'image/png']],
  ['/assets/engineering-studio-bg.jpg', ['assets/engineering-studio-bg.jpg', 'image/jpeg']],
  ['/assets/salon-bg.jpg', ['assets/salon-bg.jpg', 'image/jpeg']],
  ['/assets/industrial-studio-bg.jpg', ['assets/industrial-studio-bg.jpg', 'image/jpeg']],
  ['/notes/07-UnoR3学习方案.md', ['notes/07-UnoR3学习方案.md', 'text/markdown; charset=utf-8']],
  ['/examples/Heartbeat/Heartbeat.ino', ['examples/Heartbeat/Heartbeat.ino', 'text/plain; charset=utf-8']],
  ['/examples/ButtonLamp/ButtonLamp.ino', ['examples/ButtonLamp/ButtonLamp.ino', 'text/plain; charset=utf-8']],
  ['/examples/ThresholdMonitor/ThresholdMonitor.ino', ['examples/ThresholdMonitor/ThresholdMonitor.ino', 'text/plain; charset=utf-8']],
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/embedded.html', ['embedded.html', 'text/html; charset=utf-8']],
  ['/english.html', ['english.html', 'text/html; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/atmosphere.css', ['atmosphere.css', 'text/css; charset=utf-8']],
  ['/worlds.css', ['worlds.css', 'text/css; charset=utf-8']],
  ['/spaces.css', ['spaces.css', 'text/css; charset=utf-8']],
  ['/assets/industrial-studio-v4.png', ['assets/industrial-studio-v4.png', 'image/png']],
  ['/assets/warm-salon-v4.png', ['assets/warm-salon-v4.png', 'image/png']],
  ['/studio.js', ['studio.js', 'text/javascript; charset=utf-8']],
  ['/lounge.js', ['lounge.js', 'text/javascript; charset=utf-8']],
  ['/assets/neon-workshop-v2.png', ['assets/neon-workshop-v2.png', 'image/png']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']]
]);

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN'
};

function send(res, status, headers, body) {
  res.writeHead(status, { ...securityHeaders, ...headers });
  res.end(body);
}

async function servePost(pathname, res) {
  const name = pathname.slice('/posts/'.length);
  if (!/^(?:index\.json|[\p{L}\p{N}_-]+\.md)$/u.test(name)) {
    send(res, 404, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Not found');
    return;
  }
  try {
    const content = await readFile(path.join(postsDir, name));
    const type = name.endsWith('.json') ? 'application/json; charset=utf-8' : 'text/markdown; charset=utf-8';
    send(res, 200, { 'Content-Type': type, 'Cache-Control': 'no-store' }, content);
  } catch {
    send(res, 404, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Not found');
  }
}

const server = http.createServer(async (request, response) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  } catch {
    send(response, 400, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Invalid path');
    return;
  }

  if (pathname === '/blog') {
    send(response, 302, { Location: '/blog.html' }, '');
    return;
  }

  if (pathname.startsWith('/api/')) {
    if (pathname === '/api/guestbook') { await handleGuestbook(request, response); return; }
    if (pathname === '/api/posts') {
      await handleBlogApi(request, response, pathname);
      return;
    }
    await handleChat(request, response, pathname);
    return;
  }

  if (pathname.startsWith('/posts/')) {
    await servePost(pathname, response);
    return;
  }

  const entry = files.get(pathname);
  if (!entry) {
    send(response, 404, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Not found');
    return;
  }

  try {
    const content = await readFile(new URL(entry[0], import.meta.url));
    send(response, 200, { 'Content-Type': entry[1], 'Cache-Control': 'no-store' }, content);
  } catch {
    send(response, 500, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Unable to load page');
  }
});

const port = Number(process.env.PORT || 4177);
const host = process.env.HOST || '127.0.0.1';
server.listen(port, host, () => {
  const displayHost = host === '0.0.0.0' ? 'localhost' : host;
  console.log(`Local: http://${displayHost}:${port}`);
});
