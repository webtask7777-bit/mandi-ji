import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const database = path.join(root, 'server/db/data/blog-posts.json');
const posts = JSON.parse(await readFile(database, 'utf8'));
let count = 0;
for (const filename of (await readdir(path.join(root, 'content/editorial'))).filter(name => name.endsWith('.json') && !name.startsWith('thumbnail-prompts-')).sort()) {
  const post = JSON.parse(await readFile(path.join(root, 'content/editorial', filename), 'utf8'));
  if (!post.id || !post.slug) throw new Error(`Missing stable id or slug: ${filename}`);
  const index = posts.findIndex(item => item.id === post.id);
  if (posts.some(item => item.slug === post.slug && item.id !== post.id)) throw new Error(`Conflicting slug: ${post.slug}`);
  if (index < 0) posts.push(post); else posts[index] = post;
  count++;
}
await writeFile(database, JSON.stringify(posts, null, 2) + '\n');
console.log(`Synchronized ${count} editorial source files; unrelated CMS entries preserved. Run npm run check:editorial before publishing.`);
