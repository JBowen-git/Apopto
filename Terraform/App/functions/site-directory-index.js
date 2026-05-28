function handler(event) {
  var request = event.request;
  var uri = request.uri;
  var pageRoutes = {
    '/': true,
    '/404': true,
    '/about': true,
    '/account': true,
    '/callback': true,
    '/contact': true,
    '/error': true,
    '/insights': true,
    '/portfolio': true,
    '/solutions': true,
    '/start-a-project': true
  };

  if (uri.startsWith('/internal/')) {
    return {
      statusCode: 404,
      statusDescription: 'Not Found',
      headers: {
        'cache-control': { value: 'no-store' }
      }
    };
  }

  if (uri === '/' || uri.startsWith('/api/')) {
    return request;
  }

  if (uri.includes('.')) {
    return request;
  }

  var route = uri.length > 1 && uri.endsWith('/') ? uri.slice(0, -1) : uri;

  if (!pageRoutes[route]) {
    return {
      statusCode: 404,
      statusDescription: 'Not Found',
      headers: {
        'cache-control': { value: 'public, max-age=60' },
        'content-type': { value: 'text/html; charset=utf-8' }
      },
      body: '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Page Not Found | Apopto</title></head><body><main><h1>Page not found.</h1><p>The page you requested does not exist.</p><p><a href="/">Back Home</a></p></main></body></html>'
    };
  }

  request.uri = route === '/' ? '/index.html' : route + '/index.html';
  return request;
}
