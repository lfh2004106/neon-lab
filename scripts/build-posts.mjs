import { buildManifest, postsDir } from './post-utils.mjs';

const posts = await buildManifest();
console.log(`Updated ${postsDir}\\index.json (${posts.length} post${posts.length === 1 ? '' : 's'}).`);
