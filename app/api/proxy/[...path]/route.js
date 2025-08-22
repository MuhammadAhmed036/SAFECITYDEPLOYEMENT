export const dynamic = 'force-dynamic'; // don't cache on the server

export async function GET(req, { params }) {
  // joins e.g. ["luna-streams","1","streams"] -> "luna-streams/1/streams"
  const upstreamPath = params.path?.join('/') ?? '';
  const search = req.nextUrl.search || ''; // includes "?page_size=100"
  const upstreamURL = `http://192.168.18.70:8080/api/${upstreamPath}${search}`;

  try {
    const res = await fetch(upstreamURL, { cache: 'no-store' });
    const body = await res.text(); // pass through as-is

    return new Response(body, {
      status: res.status,
      headers: {
        'content-type': res.headers.get('content-type') ?? 'application/json',
        'cache-control': 'no-store',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Proxy fetch failed', detail: String(err) }), {
      status: 502,
      headers: { 'content-type': 'application/json' },
    });
  }
}
