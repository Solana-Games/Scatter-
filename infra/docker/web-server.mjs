import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const port = Number(process.env.PORT || 3000);
const root = join(process.cwd(), 'apps/web');

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.tsx': 'text/plain; charset=utf-8',
  '.ts': 'text/plain; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

http
  .createServer(async (req, res) => {
    const safePath = (req.url === '/' ? '/app/page.tsx' : req.url || '/app/page.tsx').replace(/\.\./g, '');
    const filePath = join(root, safePath);
    try {
      const content = await readFile(filePath);
      const contentType = mime[extname(filePath)] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    } catch {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'File not found in web image', path: safePath }));
    }
  })
  .listen(port, () => {
    console.log(`SCATERX web image serving on :${port}`);
  });
