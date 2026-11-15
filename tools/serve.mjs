import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const { files } = JSON.parse(await readFile(resolve(root, 'build-manifest.json'), 'utf8'));
const published = new Set(['build-manifest.json', ...files.map(file => file.path)]);
const port = 8178;
const url = 'http://127.0.0.1:' + port;
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.glb': 'model/gltf-binary',
  '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.ogg': 'audio/ogg', '.opus': 'audio/opus', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.ttf': 'font/ttf', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8',
};

const server = createServer(async (request, response) => {
  try {
    if (!['GET', 'HEAD'].includes(request.method)) return response.writeHead(405).end();
    const relative = decodeURIComponent(new URL(request.url, url).pathname).replace(/^\//, '') || 'index.html';
    if (relative === 'favicon.ico') return response.writeHead(204).end();
    const file = resolve(root, relative);
    if (!published.has(relative) || !file.startsWith(root + sep)) return response.writeHead(404).end();
    const { size } = await stat(file);
    response.writeHead(200, {
      'Content-Type': types[extname(file)] ?? 'application/octet-stream',
      'Content-Length': size, 'Cache-Control': 'no-cache'
    });
    if (request.method === 'HEAD') return response.end();
    createReadStream(file).on('error', () => response.destroy()).pipe(response);
  } catch {
    if (!response.headersSent) response.writeHead(404);
    response.end();
  }
});

server.on('error', error => {
  console.error(error.code === 'EADDRINUSE' ? 'Порт ' + port + ' уже используется.' : error.message);
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => {
  console.log('Пепельная клятва · ' + url);
  console.log('Сервер работает, пока открыто это окно.');
  if (process.platform === 'win32' && process.argv.includes('--open')) {
    const browser = spawn('rundll32.exe', ['url.dll,FileProtocolHandler', url], { detached: true, stdio: 'ignore' });
    browser.on('error', () => console.log('Откройте адрес в браузере: ' + url));
    browser.unref();
  }
});
