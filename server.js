const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const STATIC_DIR = path.join(__dirname);

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
};

function proxyRequest(targetUrl, res) {
    const client = targetUrl.startsWith('https') ? https : http;
    const req = client.get(targetUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'application/json',
        },
        timeout: 10000,
    }, (upstream) => {
        res.writeHead(upstream.statusCode, {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': '*',
        });
        upstream.pipe(res);
    });
    req.on('error', (err) => {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ code: 502, msg: 'Proxy error: ' + err.message }));
    });
    req.on('timeout', () => {
        req.destroy();
        res.writeHead(504, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ code: 504, msg: 'Upstream timeout' }));
    });
}

const server = http.createServer((req, res) => {
    // CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': '*',
        });
        return res.end();
    }

    // API proxy route: /proxy/<encoded_url>
    if (req.url.startsWith('/proxy/')) {
        const encoded = decodeURIComponent(req.url.slice(7));
        if (!encoded.startsWith('http://') && !encoded.startsWith('https://')) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ code: 400, msg: 'Invalid target URL' }));
        }
        return proxyRequest(encoded, res);
    }

    // Static file serving
    let filePath = path.join(STATIC_DIR, req.url === '/' ? 'index.html' : req.url.split('?')[0]);

    // Security: prevent directory traversal
    if (!filePath.startsWith(STATIC_DIR)) {
        res.writeHead(403);
        return res.end('Forbidden');
    }

    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
        if (err) {
            // Fallback to index.html for SPA routing
            if (err.code === 'ENOENT') {
                fs.readFile(path.join(STATIC_DIR, 'index.html'), (err2, indexData) => {
                    if (err2) {
                        res.writeHead(500);
                        return res.end('Internal Server Error');
                    }
                    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                    res.end(indexData);
                });
                return;
            }
            res.writeHead(500);
            return res.end('Internal Server Error');
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
});

server.listen(PORT, () => {
    console.log(`LibreTV server running on http://localhost:${PORT}`);
});
