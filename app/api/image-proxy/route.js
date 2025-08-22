export const dynamic = 'force-dynamic';

export async function GET(req) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) {
    return new Response('Missing url parameter', { status: 400 });
  }
  try {
    const upstream = await fetch(url, { cache: 'no-store' });
    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    const body = await upstream.arrayBuffer();
    return new Response(body, {
      status: upstream.status,
      headers: {
        'content-type': contentType,
        'cache-control': 'no-store',
        'access-control-allow-origin': '*',
      },
    });
  } catch (e) {
    return new Response('Proxy failed', { status: 502 });
  }
}


