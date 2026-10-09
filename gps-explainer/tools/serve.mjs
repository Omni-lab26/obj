// Minimal static file server for the renderer (Chromium blocks fetch() on file://).
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const TYPES = {".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".ttf": "font/ttf", ".png": "image/png", ".css": "text/css"};
export function serve(port = 0) {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const p = path.join(ROOT, decodeURIComponent(new URL(req.url, "http://x").pathname));
      if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, {"Content-Type": TYPES[path.extname(p)] || "application/octet-stream"});
      fs.createReadStream(p).pipe(res);
    });
    srv.listen(port, "127.0.0.1", () => resolve({srv, url: `http://127.0.0.1:${srv.address().port}`}));
  });
}
