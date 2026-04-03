/**
 * Placeholder Lambda for HeatFX HTTP API (API Gateway v2).
 * Add create/list/get/delete session routes here and call DynamoDB + S3.
 */
export const handler = async (event) => {
  const http = event.requestContext?.http;
  const path = event.rawPath || '';
  const method = http?.method || 'GET';

  const allowOrigin = process.env.CORS_ALLOW_ORIGIN || '*';
  const headers = {
    'content-type': 'application/json',
    'access-control-allow-origin': allowOrigin,
  };

  if (path === '/health' && method === 'GET') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 'ok',
        service: 'heatfx-api',
        table: process.env.SESSIONS_TABLE_NAME,
        bucket: process.env.RECORDINGS_BUCKET_NAME,
      }),
    };
  }

  const claims = event.requestContext?.authorizer?.jwt?.claims;

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      path,
      method,
      sub: claims?.sub ?? null,
      message: 'HeatFX API placeholder — implement /api/* handlers next.',
    }),
  };
};
