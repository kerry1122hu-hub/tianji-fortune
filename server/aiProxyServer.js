const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const http = require('http');
const { URL } = require('url');
const { loadConfig } = require('./aiProxyConfig');

const config = loadConfig();
const LOG_FILE = path.join(config.logDir, 'ai-proxy.log');
const NOTIFICATION_PREFS_FILE = path.join(config.logDir, 'notification-preferences.jsonl');
const MAX_BODY_BYTES = 1024 * 1024;
const rateLimitStore = new Map();
const nonceStore = new Map();

function ensureLogDir() {
  if (!fs.existsSync(config.logDir)) {
    fs.mkdirSync(config.logDir, { recursive: true });
  }
}

function writeLog(level, event, meta = {}) {
  ensureLogDir();
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    event,
    env: config.envName,
    ...meta,
  });
  fs.appendFileSync(LOG_FILE, `${line}\n`, 'utf8');
}

function appendNotificationPreference(payload) {
  ensureLogDir();
  fs.appendFileSync(
    NOTIFICATION_PREFS_FILE,
    `${JSON.stringify({ ts: new Date().toISOString(), ...payload })}\n`,
    'utf8'
  );
}

function sendJson(res, statusCode, payload, extraHeaders = {}) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': config.allowOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,X-MingMe-Token,X-MingMe-Timestamp,X-MingMe-Nonce,X-MingMe-Signature',
    ...extraHeaders,
  });
  res.end(JSON.stringify(payload));
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }

  return req.socket?.remoteAddress || 'unknown';
}

function getClientKey(req) {
  const ip = getClientIp(req);
  const token = req.headers['x-mingme-token'] || 'anonymous';
  return `${ip}:${token}`;
}

function safeHash(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 16);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetryStatus(status) {
  return status === 408 || status === 409 || status === 429 || status >= 500;
}

function requireAuth(req) {
  if (!config.authToken) {
    return true;
  }

  return req.headers['x-mingme-token'] === config.authToken;
}

function buildSignatureBase(timestamp, nonce, rawBody) {
  return `${timestamp}.${nonce}.${rawBody}`;
}

function signPayload(timestamp, nonce, rawBody) {
  return crypto
    .createHmac('sha256', config.signingSecret)
    .update(buildSignatureBase(timestamp, nonce, rawBody))
    .digest('hex');
}

function hasFreshTimestamp(timestampHeader) {
  const timestamp = Number(timestampHeader);
  if (!Number.isFinite(timestamp)) {
    return false;
  }

  return Math.abs(Date.now() - timestamp) <= config.signingMaxSkewMs;
}

function isReplay(nonce, timestampHeader) {
  const key = `${timestampHeader}:${nonce}`;
  const now = Date.now();

  for (const [entryKey, expiresAt] of nonceStore.entries()) {
    if (expiresAt <= now) {
      nonceStore.delete(entryKey);
    }
  }

  if (nonceStore.has(key)) {
    return true;
  }

  nonceStore.set(key, now + config.signingMaxSkewMs);
  return false;
}

function verifySignature(req, rawBody) {
  if (!config.signingSecret) {
    return { ok: true, mode: 'disabled' };
  }

  const timestamp = req.headers['x-mingme-timestamp'];
  const nonce = req.headers['x-mingme-nonce'];
  const signature = req.headers['x-mingme-signature'];

  if (!timestamp || !nonce || !signature) {
    return { ok: false, reason: 'Missing signature headers.' };
  }

  if (!hasFreshTimestamp(timestamp)) {
    return { ok: false, reason: 'Signature timestamp expired.' };
  }

  if (isReplay(nonce, timestamp)) {
    return { ok: false, reason: 'Replay request detected.' };
  }

  const expected = signPayload(timestamp, nonce, rawBody);
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const signatureBuffer = Buffer.from(String(signature), 'utf8');

  if (
    expectedBuffer.length !== signatureBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)
  ) {
    return { ok: false, reason: 'Invalid request signature.' };
  }

  return { ok: true, mode: 'hmac' };
}

function checkRateLimit(req) {
  const key = getClientKey(req);
  const now = Date.now();
  const bucket = rateLimitStore.get(key) || [];
  const recent = bucket.filter((ts) => now - ts < config.rateLimitWindowMs);

  if (recent.length >= config.rateLimitMax) {
    rateLimitStore.set(key, recent);
    return {
      allowed: false,
      remaining: 0,
      resetInMs: config.rateLimitWindowMs - (now - recent[0]),
    };
  }

  recent.push(now);
  rateLimitStore.set(key, recent);
  return {
    allowed: true,
    remaining: config.rateLimitMax - recent.length,
    resetInMs: config.rateLimitWindowMs,
  };
}

function collectBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';

    req.on('data', (chunk) => {
      raw += chunk;
      if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) {
        reject(new Error('Request body too large.'));
      }
    });

    req.on('end', () => {
      try {
        resolve({
          rawBody: raw,
          body: raw ? JSON.parse(raw) : {},
        });
      } catch (error) {
        reject(new Error('Invalid JSON body.'));
      }
    });

    req.on('error', reject);
  });
}

function extractOutputText(payload) {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const texts = [];

  (payload?.output || []).forEach((item) => {
    (item?.content || []).forEach((content) => {
      if (content?.type === 'output_text' && content?.text) {
        texts.push(content.text);
      }
    });
  });

  return texts.join('\n').trim();
}

async function callOpenAIWithRetry({ instructions, input, model }) {
  if (!config.openAIApiKey) {
    throw new Error('Missing OPENAI_API_KEY.');
  }

  let lastError = null;

  for (let attempt = 0; attempt <= config.upstreamRetries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);

    try {
      const response = await fetch(`${config.openAIBaseUrl.replace(/\/$/, '')}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.openAIApiKey}`,
        },
        body: JSON.stringify({
          model: model || config.openAIModel,
          instructions,
          input,
          max_output_tokens: 1800,
        }),
        signal: controller.signal,
      });

      const payload = await response.json();
      clearTimeout(timeout);

      if (!response.ok) {
        const message = payload?.error?.message || `OpenAI request failed: HTTP ${response.status}`;
        const error = new Error(message);
        error.status = response.status;
        error.retryable = shouldRetryStatus(response.status);
        throw error;
      }

      return {
        text: extractOutputText(payload),
        id: payload?.id || null,
        model: payload?.model || model || config.openAIModel,
        usage: payload?.usage || null,
        attempts: attempt + 1,
      };
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;

      const retryable =
        error?.name === 'AbortError' ||
        error?.retryable === true ||
        /network|fetch/i.test(error?.message || '');

      if (!retryable || attempt === config.upstreamRetries) {
        break;
      }

      await sleep(config.upstreamRetryDelayMs * (attempt + 1));
    }
  }

  throw lastError || new Error('OpenAI request failed.');
}

function summarizeBody(body) {
  return {
    locale: body?.locale || null,
    model: body?.model || config.openAIModel,
    inputChars: typeof body?.input === 'string' ? body.input.length : 0,
    instructionsChars: typeof body?.instructions === 'string' ? body.instructions.length : 0,
  };
}

const server = http.createServer(async (req, res) => {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  const url = new URL(req.url, `http://${req.headers.host}`);
  const ip = getClientIp(req);

  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return;
  }

  if (req.method === 'GET' && url.pathname === '/health') {
    sendJson(res, 200, {
      ok: true,
      env: config.envName,
      provider: 'openai',
      model: config.openAIModel,
      authEnabled: Boolean(config.authToken),
      signingEnabled: Boolean(config.signingSecret),
      rateLimit: {
        max: config.rateLimitMax,
        windowMs: config.rateLimitWindowMs,
      },
      retry: {
        retries: config.upstreamRetries,
        delayMs: config.upstreamRetryDelayMs,
      },
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/ai-reading') {
    const rateLimit = checkRateLimit(req);
    const commonHeaders = {
      'X-RateLimit-Remaining': String(rateLimit.remaining),
      'X-RateLimit-Reset-Ms': String(rateLimit.resetInMs),
      'X-Request-Id': requestId,
    };

    if (!requireAuth(req)) {
      writeLog('warn', 'auth_failed', {
        requestId,
        ip,
        tokenHash: safeHash(req.headers['x-mingme-token'] || ''),
      });
      sendJson(res, 401, { error: 'Unauthorized.' }, commonHeaders);
      return;
    }

    if (!rateLimit.allowed) {
      writeLog('warn', 'rate_limited', {
        requestId,
        ip,
        resetInMs: rateLimit.resetInMs,
      });
      sendJson(
        res,
        429,
        {
          error: 'Rate limit exceeded.',
          resetInMs: rateLimit.resetInMs,
        },
        commonHeaders
      );
      return;
    }

    try {
      const { rawBody, body } = await collectBody(req);
      const signatureState = verifySignature(req, rawBody);

      if (!signatureState.ok) {
        writeLog('warn', 'signature_failed', {
          requestId,
          ip,
          reason: signatureState.reason,
        });
        sendJson(res, 401, { error: signatureState.reason }, commonHeaders);
        return;
      }

      writeLog('info', 'request_received', {
        requestId,
        ip,
        signatureMode: signatureState.mode,
        body: summarizeBody(body),
      });

      const result = await callOpenAIWithRetry(body);
      writeLog('info', 'request_succeeded', {
        requestId,
        ip,
        durationMs: Date.now() - startedAt,
        model: result.model,
        attempts: result.attempts,
        usage: result.usage,
      });

      sendJson(res, 200, result, commonHeaders);
    } catch (error) {
      writeLog('error', 'request_failed', {
        requestId,
        ip,
        durationMs: Date.now() - startedAt,
        message: error.message || 'Unknown server error.',
      });
      sendJson(
        res,
        error?.status === 429 ? 429 : 500,
        {
          error: error.message || 'Unknown server error.',
        },
        commonHeaders
      );
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/notification-preferences') {
    const commonHeaders = {
      'X-Request-Id': requestId,
    };

    if (!requireAuth(req)) {
      sendJson(res, 401, { error: 'Unauthorized.' }, commonHeaders);
      return;
    }

    try {
      const { rawBody, body } = await collectBody(req);
      const signatureState = verifySignature(req, rawBody);

      if (!signatureState.ok) {
        sendJson(res, 401, { error: signatureState.reason }, commonHeaders);
        return;
      }

      appendNotificationPreference({
        requestId,
        ip,
        body,
      });

      sendJson(res, 200, { ok: true }, commonHeaders);
    } catch (error) {
      sendJson(res, 500, { error: error.message || 'Failed to save notification preferences.' }, commonHeaders);
    }
    return;
  }

  sendJson(res, 404, {
    error: 'Not found.',
  });
});

server.listen(config.port, () => {
  writeLog('info', 'server_started', {
    port: config.port,
    authEnabled: Boolean(config.authToken),
    signingEnabled: Boolean(config.signingSecret),
    rateLimitMax: config.rateLimitMax,
    rateLimitWindowMs: config.rateLimitWindowMs,
    retries: config.upstreamRetries,
  });
  console.log(`AI proxy server listening on http://localhost:${config.port}`);
});
