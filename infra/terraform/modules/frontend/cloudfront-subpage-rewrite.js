function handler(event) {
  var uri = event.request.uri;
  if (uri === '/' || uri === '') {
    event.request.uri = '/index.html';
  } else if (!uri.split('/').pop().includes('.')) {
    event.request.uri = uri + '.html';
  }
  return event.request;
}
