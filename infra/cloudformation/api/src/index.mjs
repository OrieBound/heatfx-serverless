import {
  DynamoDBClient,
  PutItemCommand,
  DeleteItemCommand,
  QueryCommand,
  ScanCommand,
} from '@aws-sdk/client-dynamodb';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import {
  CognitoIdentityProviderClient,
  AdminAddUserToGroupCommand,
  AdminRemoveUserFromGroupCommand,
  ListUsersInGroupCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

const dynamo  = new DynamoDBClient({});
const s3      = new S3Client({});
const cognito = new CognitoIdentityProviderClient({});

const TABLE        = process.env.SESSIONS_TABLE_NAME;
const BUCKET       = process.env.RECORDINGS_BUCKET_NAME;
const ORIGIN       = process.env.CORS_ALLOW_ORIGIN || '*';
const USER_POOL_ID = process.env.USER_POOL_ID;
const ADMIN_GROUP  = 'admins';

const headers = {
  'content-type': 'application/json',
  'access-control-allow-origin': ORIGIN,
  'access-control-allow-headers': 'authorization,content-type',
};

// ── helpers ───────────────────────────────────────────────────────────────────

function ok(body)      { return { statusCode: 200, headers, body: JSON.stringify(body) }; }
function created(body) { return { statusCode: 201, headers, body: JSON.stringify(body) }; }
function err(code, msg){ return { statusCode: code, headers, body: JSON.stringify({ error: msg }) }; }

function getClaims(event) {
  return event.requestContext?.authorizer?.jwt?.claims ?? null;
}

function getSub(event) {
  return getClaims(event)?.sub ?? null;
}

/** Check if caller is in the Cognito "admins" group via JWT claim.
 *
 *  API Gateway HTTP API serialises the cognito:groups array to a string,
 *  e.g. '["admins"]' or '"admins"' or 'admins' or 'admins,editors'.
 *  Strip all JSON punctuation (brackets, quotes, spaces) then split on
 *  commas — this is format-agnostic and always correct.
 */
function isAdmin(event) {
  const raw = getClaims(event)?.['cognito:groups'];
  if (!raw) return false;
  if (Array.isArray(raw)) return raw.includes(ADMIN_GROUP);
  // Normalise: remove [ ] " ' whitespace, split on commas
  const groups = String(raw).replace(/[\[\]"'\s]/g, '').split(',');
  return groups.includes(ADMIN_GROUP);
}

/** DynamoDB item → plain JS object */
function fromItem(item) {
  const out = {};
  for (const [k, v] of Object.entries(item)) {
    if (v.S !== undefined)    out[k] = v.S;
    else if (v.N !== undefined)    out[k] = Number(v.N);
    else if (v.BOOL !== undefined) out[k] = v.BOOL;
  }
  return out;
}

function sessionFromItem(item) {
  const o = fromItem(item);
  return {
    sessionId:    o.sessionId,
    sub:          o.sub,
    userEmail:    o.userEmail    || '',
    userNickname: o.userNickname || '',
    createdAt:    o.createdAt,
    gridWidthPx:  o.gridWidthPx,
    gridHeightPx: o.gridHeightPx,
    aspectRatio:  o.aspectRatio,
    durationMs:   o.durationMs,
    eventCounts:  JSON.parse(o.eventCounts || '{}'),
    s3Key:        o.s3Key,
  };
}

// ── user route handlers ───────────────────────────────────────────────────────

async function createSession(event, sub) {
  const claims = getClaims(event);
  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return err(400, 'Invalid JSON body'); }

  const { gridWidthPx, gridHeightPx, aspectRatio, durationMs, eventCounts, events, settingSnapshots } = body;
  if (!events || !Array.isArray(events)) return err(400, 'events array required');

  const sessionId = randomUUID();
  const createdAt = new Date().toISOString();
  const s3Key     = `sessions/${sub}/${sessionId}/events.json`;

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET, Key: s3Key,
    Body: JSON.stringify({ events, settingSnapshots: settingSnapshots ?? [] }),
    ContentType: 'application/json',
  }));

  await dynamo.send(new PutItemCommand({
    TableName: TABLE,
    Item: {
      pk:           { S: `USER#${sub}` },
      sk:           { S: `SESSION#${createdAt}#${sessionId}` },
      sessionId:    { S: sessionId },
      sub:          { S: sub },
      userEmail:    { S: claims?.email    ?? '' },
      userNickname: { S: claims?.nickname ?? '' },
      createdAt:    { S: createdAt },
      gridWidthPx:  { N: String(gridWidthPx  ?? 0) },
      gridHeightPx: { N: String(gridHeightPx ?? 0) },
      aspectRatio:  { S: aspectRatio  ?? '' },
      durationMs:   { N: String(durationMs   ?? 0) },
      eventCounts:  { S: JSON.stringify(eventCounts ?? {}) },
      s3Key:        { S: s3Key },
    },
  }));

  return created({ sessionId, createdAt });
}

async function listSessions(event, sub) {
  const result = await dynamo.send(new QueryCommand({
    TableName:              TABLE,
    KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
    ExpressionAttributeValues: {
      ':pk':     { S: `USER#${sub}` },
      ':prefix': { S: 'SESSION#' },
    },
    ScanIndexForward: false,
    Limit: 20,
  }));

  const sessions = (result.Items ?? []).map(item => {
    const o = sessionFromItem(item);
    return {
      sessionId:    o.sessionId,
      createdAt:    o.createdAt,
      gridWidthPx:  o.gridWidthPx,
      gridHeightPx: o.gridHeightPx,
      aspectRatio:  o.aspectRatio,
      durationMs:   o.durationMs,
      eventCounts:  o.eventCounts,
    };
  });

  return ok({ sessions });
}

async function getSession(event, sub, sessionId) {
  const result = await dynamo.send(new QueryCommand({
    TableName:              TABLE,
    KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
    FilterExpression:       'sessionId = :sid',
    ExpressionAttributeValues: {
      ':pk':     { S: `USER#${sub}` },
      ':prefix': { S: 'SESSION#' },
      ':sid':    { S: sessionId },
    },
  }));

  const item = result.Items?.[0];
  if (!item) return err(404, 'Session not found');

  const o   = sessionFromItem(item);
  const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: o.s3Key }), { expiresIn: 300 });
  return ok({ ...o, eventsUrl: url });
}

async function deleteSession(event, sub, sessionId) {
  const result = await dynamo.send(new QueryCommand({
    TableName:              TABLE,
    KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
    FilterExpression:       'sessionId = :sid',
    ExpressionAttributeValues: {
      ':pk':     { S: `USER#${sub}` },
      ':prefix': { S: 'SESSION#' },
      ':sid':    { S: sessionId },
    },
  }));

  const item = result.Items?.[0];
  if (!item) return err(404, 'Session not found');
  const o = sessionFromItem(item);

  await Promise.all([
    dynamo.send(new DeleteItemCommand({ TableName: TABLE, Key: { pk: { S: `USER#${sub}` }, sk: { S: item.sk.S } } })),
    s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: o.s3Key })),
  ]);

  return ok({ deleted: sessionId });
}

// ── admin — recordings ────────────────────────────────────────────────────────

async function adminListAllSessions(event) {
  if (!isAdmin(event)) return err(403, 'Forbidden');

  const items = [];
  let lastKey;
  do {
    const result = await dynamo.send(new ScanCommand({
      TableName:        TABLE,
      FilterExpression: 'begins_with(sk, :prefix)',
      ExpressionAttributeValues: { ':prefix': { S: 'SESSION#' } },
      ExclusiveStartKey: lastKey,
    }));
    items.push(...(result.Items ?? []));
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  const sessions = items
    .map(sessionFromItem)
    .map(o => ({
      sessionId: o.sessionId, sub: o.sub,
      userEmail: o.userEmail, userNickname: o.userNickname,
      createdAt: o.createdAt, durationMs: o.durationMs,
      gridWidthPx: o.gridWidthPx, gridHeightPx: o.gridHeightPx,
      aspectRatio: o.aspectRatio, eventCounts: o.eventCounts,
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return ok({ sessions });
}

async function adminGetSession(event, sessionId) {
  if (!isAdmin(event)) return err(403, 'Forbidden');

  const result = await dynamo.send(new ScanCommand({
    TableName: TABLE,
    FilterExpression: 'sessionId = :sid',
    ExpressionAttributeValues: { ':sid': { S: sessionId } },
  }));

  const item = result.Items?.[0];
  if (!item) return err(404, 'Session not found');

  const o   = sessionFromItem(item);
  const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: o.s3Key }), { expiresIn: 300 });
  return ok({ ...o, eventsUrl: url });
}

async function adminDeleteSession(event, sessionId) {
  if (!isAdmin(event)) return err(403, 'Forbidden');

  const result = await dynamo.send(new ScanCommand({
    TableName: TABLE,
    FilterExpression: 'sessionId = :sid',
    ExpressionAttributeValues: { ':sid': { S: sessionId } },
  }));

  const item = result.Items?.[0];
  if (!item) return err(404, 'Session not found');
  const o = sessionFromItem(item);

  await Promise.all([
    dynamo.send(new DeleteItemCommand({ TableName: TABLE, Key: { pk: { S: item.pk.S }, sk: { S: item.sk.S } } })),
    s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: o.s3Key })),
  ]);

  return ok({ deleted: sessionId });
}

// ── admin — group management ──────────────────────────────────────────────────

/** GET /api/admin/admins — list all members of the admins group */
async function adminListAdmins(event) {
  if (!isAdmin(event)) return err(403, 'Forbidden');

  const result = await cognito.send(new ListUsersInGroupCommand({
    UserPoolId: USER_POOL_ID,
    GroupName:  ADMIN_GROUP,
  }));

  const admins = (result.Users ?? []).map(u => ({
    username: u.Username,
    email:    u.Attributes?.find(a => a.Name === 'email')?.Value    ?? '',
    nickname: u.Attributes?.find(a => a.Name === 'nickname')?.Value ?? '',
    enabled:  u.Enabled,
  }));

  return ok({ admins });
}

/** POST /api/admin/admins — grant admin to a user { email } */
async function adminGrant(event) {
  if (!isAdmin(event)) return err(403, 'Forbidden');
  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return err(400, 'Invalid JSON'); }
  const { email } = body;
  if (!email) return err(400, 'email required');

  await cognito.send(new AdminAddUserToGroupCommand({
    UserPoolId: USER_POOL_ID,
    Username:   email.trim().toLowerCase(),
    GroupName:  ADMIN_GROUP,
  }));

  return ok({ granted: email.trim().toLowerCase() });
}

/** DELETE /api/admin/admins — revoke admin from a user { email } */
async function adminRevoke(event) {
  if (!isAdmin(event)) return err(403, 'Forbidden');
  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return err(400, 'Invalid JSON'); }
  const { email } = body;
  if (!email) return err(400, 'email required');

  // Prevent self-revoke
  const callerEmail = getClaims(event)?.email ?? '';
  if (email.trim().toLowerCase() === callerEmail.toLowerCase()) {
    return err(400, 'You cannot revoke your own admin access');
  }

  await cognito.send(new AdminRemoveUserFromGroupCommand({
    UserPoolId: USER_POOL_ID,
    Username:   email.trim().toLowerCase(),
    GroupName:  ADMIN_GROUP,
  }));

  return ok({ revoked: email.trim().toLowerCase() });
}

// ── router ────────────────────────────────────────────────────────────────────

async function route(event) {
  const method = event.requestContext?.http?.method || 'GET';
  const path   = event.rawPath || '';

  if (path === '/health' && method === 'GET') {
    return ok({ status: 'ok', service: 'heatfx-api', table: TABLE, bucket: BUCKET });
  }

  // Diagnostic: returns the raw JWT claims so we can verify what API Gateway passes
  if (path === '/api/admin/claims' && method === 'GET') {
    const claims = getClaims(event);
    const raw    = claims?.['cognito:groups'];
    return ok({ claims, cognitoGroupsRaw: raw, cognitoGroupsType: typeof raw, isAdmin: isAdmin(event) });
  }

  const sub = getSub(event);
  if (!sub) return err(401, 'Unauthorized');

  // ── Admin — group management ──
  if (path === '/api/admin/admins' && method === 'GET')    return adminListAdmins(event);
  if (path === '/api/admin/admins' && method === 'POST')   return adminGrant(event);
  if (path === '/api/admin/admins' && method === 'DELETE') return adminRevoke(event);

  // ── Admin — recordings ──
  if (path === '/api/admin/sessions' && method === 'GET')  return adminListAllSessions(event);

  const adminSessionMatch = path.match(/^\/api\/admin\/sessions\/([^/]+)$/);
  if (adminSessionMatch && method === 'GET')    return adminGetSession(event, adminSessionMatch[1]);
  if (adminSessionMatch && method === 'DELETE') return adminDeleteSession(event, adminSessionMatch[1]);

  // ── User — sessions ──
  if (path === '/api/sessions' && method === 'POST') return createSession(event, sub);
  if (path === '/api/sessions' && method === 'GET')  return listSessions(event, sub);

  const sessionMatch = path.match(/^\/api\/sessions\/([^/]+)$/);
  if (sessionMatch && method === 'GET')    return getSession(event, sub, sessionMatch[1]);
  if (sessionMatch && method === 'DELETE') return deleteSession(event, sub, sessionMatch[1]);

  return err(404, 'Not found');
}

export const handler = async (event) => {
  try {
    return await route(event);
  } catch (e) {
    console.error('Unhandled Lambda error:', e);
    return err(500, e?.message ?? 'Internal server error');
  }
};
