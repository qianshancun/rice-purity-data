const ORIGIN = 'https://rice-purity-data.pages.dev';
const PREFIX = '/rice-purity-test/data';

export default {
  async fetch(request) {
    const incoming = new URL(request.url);
    let path = incoming.pathname.startsWith(PREFIX)
      ? incoming.pathname.slice(PREFIX.length)
      : incoming.pathname;
    if (path === '' || path === '/') path = '/';
    const upstream = new URL(path + incoming.search, ORIGIN);
    const headers = new Headers(request.headers);
    headers.delete('host');
    const response = await fetch(upstream, {
      method: request.method,
      headers,
      redirect: 'manual',
    });
    const out = new Headers(response.headers);
    out.delete('content-security-policy');
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: out,
    });
  },
};
