import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { files } from './assets.mjs';

const assets = Object.fromEntries(await Promise.all(Object.entries(files).map(async ([path, [file, type]]) =>
  [path, [type, await readFile(new URL(`../dist/${file}`, import.meta.url), 'utf8')]],
)));
const api = await readFile(new URL('./deepseek.mjs', import.meta.url), 'utf8');
const source = api + `
const assets = ${JSON.stringify(assets)};
export default {
  fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path === '/api/deepseek') {
      if (!request.headers.get('oai-authenticated-user-id')) return reply({ error: 'identity' }, 401);
      return analysisRoute(request, env.DEEPSEEK_API_KEY);
    }
    if (!Object.hasOwn(assets, path) || request.method !== 'GET') return new Response(null, { status: 404 });
    const [type, body] = assets[path];
    return new Response(body, { headers: { 'content-type': type + '; charset=utf-8', 'cache-control': 'no-store' } });
  },
};
`;
const out = new URL('../dist/server/', import.meta.url);
await mkdir(out, { recursive: true });
await writeFile(new URL('index.js', out), source);
