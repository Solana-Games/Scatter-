import http from 'node:http';

const port = Number(process.env.PORT || 3000);

const page = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>SCATERX</title>
    <style>
      body { margin:0; font-family: Inter, system-ui, sans-serif; background:#0b0220; color:#d7ccff; }
      main { max-width: 960px; margin: 0 auto; padding: 24px; }
      h1 { color: #a36dff; }
      .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(250px,1fr)); gap: 12px; }
      .card { background: rgba(255,255,255,.06); border:1px solid #42227b; border-radius: 12px; padding: 12px; }
    </style>
  </head>
  <body>
    <main>
      <h1>SCATERX Casino Platform</h1>
      <p>Containerized web surface for the SCATERX platform baseline.</p>
      <section class="grid">
        <article class="card">Provably Fair SHA-256 RNG</article>
        <article class="card">Scatter + Avalanche Slot Engine</article>
        <article class="card">PH Payments + Wallet Integrations</article>
        <article class="card">Realtime Jackpot & Tournament Services</article>
      </section>
    </main>
  </body>
</html>`;

http
  .createServer((req, res) => {
    if (req.url === '/' || req.url === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(page);
    }
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({ error: 'Not found' }));
  })
  .listen(port, () => {
    console.log(`SCATERX web image serving on :${port}`);
  });
