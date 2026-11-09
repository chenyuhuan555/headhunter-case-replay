import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { analysisRoute } from './server/deepseek.mjs';
import { files } from './server/assets.mjs';

const port = 4398;
const host = `127.0.0.1:${port}`;
createServer(async (incoming, outgoing) => {
  if (incoming.headers.host !== host) { outgoing.writeHead(403).end(); return; }
  const url = new URL(incoming.url, `http://${host}`);
  try {
    if (url.pathname === '/api/deepseek') {
      const method = incoming.method;
      const request = new Request(url, {
        method, headers: incoming.headers,
        ...(method === 'POST' ? { body: Readable.toWeb(incoming), duplex: 'half' } : {}),
      });
      const response = await analysisRoute(request, process.env.DEEPSEEK_API_KEY);
      outgoing.writeHead(response.status, Object.fromEntries(response.headers)).end(await response.text());
      return;
    }
    const asset = Object.hasOwn(files, url.pathname) && files[url.pathname];
    if (!asset || incoming.method !== 'GET') { outgoing.writeHead(404).end(); return; }
    const [file, type] = asset;
    const content = await readFile(new URL(`./dist/${file}`, import.meta.url));
    outgoing.writeHead(200, { 'content-type': `${type}; charset=utf-8`, 'cache-control': 'no-store' }).end(content);
  } catch { outgoing.writeHead(500).end(); }
}).listen(port, '127.0.0.1', () => console.log(`Local: http://${host}/`));
