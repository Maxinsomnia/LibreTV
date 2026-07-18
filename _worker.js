// Cloudflare Pages _worker.js - LibreTV API Proxy
// 放在项目根目录，Cloudflare Pages 会自动加载此文件作为 Worker

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        // API proxy: /proxy/<encoded_url>
        if (url.pathname.startsWith('/proxy/')) {
            // CORS preflight
            if (request.method === 'OPTIONS') {
                return new Response(null, {
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'GET, OPTIONS',
                        'Access-Control-Allow-Headers': '*',
                    },
                });
            }

            const encoded = decodeURIComponent(url.pathname.slice(7));
            if (!encoded.startsWith('http://') && !encoded.startsWith('https://')) {
                return new Response(JSON.stringify({ code: 400, msg: 'Invalid target URL' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            try {
                const upstream = await fetch(encoded, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                        'Accept': 'application/json',
                    },
                    signal: AbortSignal.timeout(10000),
                });

                const body = await upstream.text();
                return new Response(body, {
                    status: upstream.status,
                    headers: {
                        'Content-Type': 'application/json; charset=utf-8',
                        'Access-Control-Allow-Origin': '*',
                    },
                });
            } catch (err) {
                return new Response(JSON.stringify({ code: 502, msg: 'Proxy error: ' + err.message }), {
                    status: 502,
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                });
            }
        }

        // 非代理请求 - 交给 Pages 的静态文件处理
        // 使用 env.ASSETS.fetch 来获取静态资源
        return env.ASSETS.fetch(request);
    },
};
