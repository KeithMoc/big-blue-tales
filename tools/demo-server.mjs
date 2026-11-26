// Private demo server: serves _site/ (made by tools/site.sh) behind one shared password, with strict security
// headers. Used by render.yaml for the internal demo; GitHub Pages does not use it. No dependencies.
//
//   DEMO_PASSWORD=... node tools/demo-server.mjs        # PORT defaults to 10000 (Render's default)
//
// Any user name works; only the password is checked. With no DEMO_PASSWORD set, every page answers 503 (fails closed).
import { createServer } from 'node:http';
import { createReadStream, readFileSync, statSync } from 'node:fs';
import { createHash, timingSafeEqual } from 'node:crypto';
import { extname, join, normalize, resolve, sep } from 'node:path';

const ROOT = resolve(process.argv[2] || '_site');
const PORT = Number(process.env.PORT) || 10000;
const PASSWORD = process.env.DEMO_PASSWORD || '';
const sha = s => createHash('sha256').update(s).digest();
const WANT = sha(PASSWORD);

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.m4a': 'audio/mp4',
  '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8', '': 'text/plain; charset=utf-8',
};

// Scripts: the page's one inline import map is hashed from the built page, so scripts need no 'unsafe-inline' and the
// policy stays right when the page changes. Styles allow 'unsafe-inline': ui/icons.js adds a <style> at run time,
// and inline CSS cannot run code.
function csp() {
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const hashes = tag => [...html.matchAll(new RegExp(`<${tag}(?![^>]*\\bsrc=)[^>]*>([\\s\\S]*?)</${tag}>`, 'g'))]
    .map(m => `'sha256-${createHash('sha256').update(m[1]).digest('base64')}'`).join(' ');
  return [
    "default-src 'self'", `script-src 'self' ${hashes('script')}`, "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:", "media-src 'self' blob:", "font-src 'self' data:", "connect-src 'self'",
    "worker-src 'self' blob:", "object-src 'none'", "base-uri 'none'", "form-action 'none'", "frame-ancestors 'none'",
  ].join('; ');
}
const HEADERS = {
  'Content-Security-Policy': csp(),
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Strict-Transport-Security': 'max-age=31536000',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
};

function allowed(req) {
  const [scheme, value] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Basic' || !value) return false;
  const decoded = Buffer.from(value, 'base64').toString('utf8');
  return timingSafeEqual(sha(decoded.slice(decoded.indexOf(':') + 1)), WANT); // equal-length digests: constant time
}

function send(res, code, body, extra = {}) {
  res.writeHead(code, { ...HEADERS, 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', ...extra });
  res.end(body);
}

createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/healthz') return send(res, 200, 'ok'); // Render's health check, says nothing about the site
  if (!PASSWORD) return send(res, 503, 'Demo password not set.');
  if (!allowed(req)) return send(res, 401, 'Password needed.', { 'WWW-Authenticate': 'Basic realm="Big Blue Tales demo", charset="UTF-8"' });
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed.', { Allow: 'GET, HEAD' });

  let path;
  try { path = decodeURIComponent(url.pathname); } catch { return send(res, 400, 'Bad path.'); }
  if (path.includes('\0')) return send(res, 400, 'Bad path.');
  let file = normalize(join(ROOT, path));
  if (file !== ROOT && !file.startsWith(ROOT + sep)) return send(res, 404, 'Not found.'); // no ../ escapes
  let st;
  try { st = statSync(file); if (st.isDirectory()) { file = join(file, 'index.html'); st = statSync(file); } }
  catch { return send(res, 404, 'Not found.'); }
  if (!st.isFile()) return send(res, 404, 'Not found.');

  const head = { ...HEADERS, 'Content-Type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream',
    'Accept-Ranges': 'bytes', 'Cache-Control': 'private, no-cache', 'Last-Modified': st.mtime.toUTCString() };
  // Byte ranges: Safari will not play <audio> without them.
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
  if (range && (range[1] || range[2])) {
    let start = range[1] ? Number(range[1]) : st.size - Number(range[2]);
    let end = range[1] && range[2] ? Math.min(Number(range[2]), st.size - 1) : st.size - 1;
    start = Math.max(0, start);
    if (start > end || start >= st.size) return send(res, 416, '', { 'Content-Range': `bytes */${st.size}` });
    res.writeHead(206, { ...head, 'Content-Range': `bytes ${start}-${end}/${st.size}`, 'Content-Length': end - start + 1 });
    return req.method === 'HEAD' ? res.end() : createReadStream(file, { start, end }).pipe(res);
  }
  res.writeHead(200, { ...head, 'Content-Length': st.size });
  return req.method === 'HEAD' ? res.end() : createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`demo on :${PORT}, serving ${ROOT}${PASSWORD ? '' : ' (DEMO_PASSWORD not set: every page answers 503)'}`));
