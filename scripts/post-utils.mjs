import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const postsDir = path.join(projectRoot, 'posts');

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

function unquote(value) {
  const text = value.trim();
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    return text.slice(1, -1).replace(/\\"/g, '"').replace(/\\'/g, "'");
  }
  return text;
}

function parseInlineList(value) {
  const text = value.trim();
  if (!text.startsWith('[') || !text.endsWith(']')) return null;
  return text
    .slice(1, -1)
    .split(',')
    .map((item) => unquote(item))
    .filter(Boolean);
}

export function parseFrontmatter(source) {
  const match = source.match(FRONTMATTER);
  if (!match) return { data: {}, body: source };

  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!field) continue;
    const value = field[2].trim();
    const list = parseInlineList(value);
    data[field[1]] = list ?? unquote(value);
  }
  return { data, body: source.slice(match[0].length) };
}

export function normalizeTags(value) {
  if (Array.isArray(value)) return value.map((tag) => String(tag).trim()).filter(Boolean);
  if (typeof value === 'string') {
    return value.split(',').map((tag) => tag.trim()).filter(Boolean);
  }
  return [];
}

export function slugify(input) {
  return String(input || '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

export function makeFrontmatter({ title, date, tags, summary, cover }) {
  const lines = ['---', `title: ${JSON.stringify(title)}`, `date: ${date}`];
  lines.push(`tags: [${normalizeTags(tags).map((tag) => JSON.stringify(tag)).join(', ')}]`);
  if (summary) lines.push(`summary: ${JSON.stringify(summary)}`);
  if (cover) lines.push(`cover: ${JSON.stringify(cover)}`);
  lines.push('---', '');
  return lines.join('\n');
}

export async function buildManifest() {
  await fs.mkdir(postsDir, { recursive: true });
  const names = (await fs.readdir(postsDir)).filter((name) => name.endsWith('.md')).sort();
  const posts = [];

  for (const name of names) {
    const slug = name.slice(0, -3);
    const source = await fs.readFile(path.join(postsDir, name), 'utf8');
    const { data } = parseFrontmatter(source);
    if (data.draft === 'true') continue;
    posts.push({
      slug,
      title: data.title || slug,
      date: data.date || '',
      tags: normalizeTags(data.tags),
      summary: data.summary || '',
      cover: data.cover || ''
    });
  }

  posts.sort((a, b) => String(b.date).localeCompare(String(a.date)) || a.title.localeCompare(b.title, 'zh-CN'));
  await fs.writeFile(path.join(postsDir, 'index.json'), `${JSON.stringify(posts, null, 2)}\n`);
  return posts;
}
