import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateEditorialPost } from '../server/utils/editorial.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const posts = JSON.parse(await readFile(path.join(root, 'server/db/data/blog-posts.json'), 'utf8'));
const problems = [];
const published = posts.filter(post => post.status === 'published');
for (const post of posts) {
  for (const error of validateEditorialPost(post, posts)) problems.push(`${post.slug}: ${error}`);
  if (post.status !== 'published') continue;
  const image = path.resolve(root, 'public', `.${post.coverImage || ''}`);
  if (!image.startsWith(path.join(root, 'public') + path.sep) || !(await stat(image).catch(() => null))?.isFile()) problems.push(`${post.slug}: thumbnail file missing`);
  if (!post.regionLabel?.trim()) problems.push(`${post.slug}: applicability/region label missing`);
  if (!post.coverCaption?.trim()) problems.push(`${post.slug}: image caption/disclosure missing`);
  for (const match of post.content.matchAll(/\]\(\/blog\/([^\s)#]+)(?:#[^)]*)?\)/g)) {
    if (!published.some(item => item.slug === match[1])) problems.push(`${post.slug}: missing article link ${match[1]}`);
  }
  if (post.translationGroup && !published.some(item => item.translationGroup === post.translationGroup && item.language === 'hi')) problems.push(`${post.slug}: translated guide must retain its published Hindi original`);
}
for (const filename of (await readdir(path.join(root, 'content/editorial'))).filter(name => name.endsWith('.json') && !name.startsWith('thumbnail-prompts-'))) {
  const source = JSON.parse(await readFile(path.join(root, 'content/editorial', filename), 'utf8'));
  const served = posts.find(post => post.id === source.id);
  if (JSON.stringify(source) !== JSON.stringify(served)) problems.push(`${filename}: editorial source differs from served database; reconcile or run npm run sync:editorial`);
}
if (problems.length) { console.error(problems.join('\n')); process.exitCode = 1; }
else console.log(`Editorial checks passed: ${published.length} published guides; sources, images, dates, identities and translations checked.`);
