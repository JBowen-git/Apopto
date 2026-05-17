function handler(event) {
  var request = event.request;
  var uri = request.uri;

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

  request.uri = uri.endsWith('/') ? uri + 'index.html' : uri + '/index.html';
  return request;
}
