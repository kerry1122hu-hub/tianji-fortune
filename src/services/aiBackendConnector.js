import Constants from 'expo-constants';

function getExtraConfig() {
  return (
    Constants.expoConfig?.extra ||
    Constants.manifest2?.extra ||
    Constants.manifest?.extra ||
    {}
  );
}

export function getAIBackendConfig() {
  const extra = getExtraConfig();

  return {
    baseUrl: extra.aiBackendUrl || '',
    authToken: extra.aiBackendAuthToken || '',
    signingSecret: extra.aiBackendSigningSecret || '',
    retryCount: Number(extra.aiBackendRetryCount || 1),
    retryDelayMs: Number(extra.aiBackendRetryDelayMs || 700),
  };
}

export function hasAIBackendConfig() {
  return Boolean(getAIBackendConfig().baseUrl);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomHex(bytes = 8) {
  const chars = '0123456789abcdef';
  let output = '';
  for (let index = 0; index < bytes * 2; index += 1) {
    output += chars[Math.floor(Math.random() * chars.length)];
  }
  return output;
}

async function signWithSubtle(secret, message) {
  if (!globalThis.crypto?.subtle) return '';

  const encoder = new TextEncoder();
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await globalThis.crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(message)
  );

  return Array.from(new Uint8Array(signature))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

async function requestWithRetry(endpoint, requestBody, { authToken, signingSecret, retryCount, retryDelayMs }) {
  const timestamp = `${Date.now()}`;
  const nonce = randomHex(12);
  const signature = signingSecret
    ? await signWithSubtle(signingSecret, `${timestamp}.${nonce}.${requestBody}`)
    : '';

  let lastError = null;

  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { 'X-MingMe-Token': authToken } : {}),
          ...(signature
            ? {
                'X-MingMe-Timestamp': timestamp,
                'X-MingMe-Nonce': nonce,
                'X-MingMe-Signature': signature,
              }
            : {}),
        },
        body: requestBody,
      });

      const payload = await response.json();

      if (!response.ok) {
        const error = new Error(payload?.error || `Backend request failed: HTTP ${response.status}`);
        error.status = response.status;
        error.code = payload?.code || 'BACKEND_ERROR';
        error.quota = payload?.quota || payload?.data?.quota || null;
        error.riskControl = payload?.riskControl || payload?.data?.riskControl || null;
        throw error;
      }

      return payload;
    } catch (error) {
      lastError = error;
      const retryable = !error?.status || error.status === 408 || error.status >= 500;
      if (!retryable || attempt === retryCount) break;
      await sleep(retryDelayMs * (attempt + 1));
    }
  }

  throw lastError || new Error('Backend request failed.');
}

export async function requestAIChatFromBackend({
  userProfile,
  message,
  chart,
  profile,
  userKey,
  history,
}) {
  const { baseUrl, authToken, signingSecret, retryCount, retryDelayMs } = getAIBackendConfig();
  if (!baseUrl) {
    throw new Error('Missing backend URL. Fill expo.extra.aiBackendUrl in app.json.');
  }

  const endpoint = `${baseUrl.replace(/\/$/, '')}/api/ai/chat`;
  const requestBody = JSON.stringify({ userProfile, message, chart, profile, userKey, history });
  return requestWithRetry(endpoint, requestBody, { authToken, signingSecret, retryCount, retryDelayMs });
}

export async function requestAIReadingFromBackend({
  instructions,
  input,
  locale,
  chart,
  profile,
  model,
  memberTier,
  userKey,
}) {
  const { baseUrl, authToken, signingSecret, retryCount, retryDelayMs } = getAIBackendConfig();
  if (!baseUrl) {
    throw new Error('Missing backend URL. Fill expo.extra.aiBackendUrl in app.json.');
  }

  const endpoint = `${baseUrl.replace(/\/$/, '')}/api/ai/ai-reading`;
  const requestBody = JSON.stringify({
    instructions,
    input,
    locale,
    chart,
    profile,
    model,
    memberTier,
    userKey,
  });
  return requestWithRetry(endpoint, requestBody, { authToken, signingSecret, retryCount, retryDelayMs });
}

export async function requestXiaoLiuRenFromBackend({
  question,
  chart,
  profile,
  userKey,
  sceneType,
  mode = 'current',
  eventDateTime,
  timezoneOffsetMinutes,
  engineVersion = 'v1.1',
  model = 'gpt-4o-mini',
  memberTier = 'free',
}) {
  const { baseUrl, authToken, signingSecret, retryCount, retryDelayMs } = getAIBackendConfig();
  if (!baseUrl) {
    throw new Error('Missing backend URL. Fill expo.extra.aiBackendUrl in app.json.');
  }

  const endpoint = `${baseUrl.replace(/\/$/, '')}/api/ai/xiao-liu-ren`;
  const requestBody = JSON.stringify({
    question,
    chart,
    profile,
    userKey,
    sceneType,
    mode,
    eventDateTime,
    timezoneOffsetMinutes,
    engineVersion,
    model,
    memberTier,
  });
  return requestWithRetry(endpoint, requestBody, { authToken, signingSecret, retryCount, retryDelayMs });
}

export async function requestAIQuotaStatusFromBackend({ chart, profile, userKey }) {
  const { baseUrl, authToken } = getAIBackendConfig();
  if (!baseUrl) {
    throw new Error('Missing backend URL. Fill expo.extra.aiBackendUrl in app.json.');
  }

  const endpoint = `${baseUrl.replace(/\/$/, '')}/api/ai/quota-status`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { 'X-MingMe-Token': authToken } : {}),
    },
    body: JSON.stringify({ chart, profile, userKey }),
  });

  const payload = await response.json();
  if (!response.ok) {
    const error = new Error(payload?.error || `Backend quota status failed: HTTP ${response.status}`);
    error.status = response.status;
    error.code = payload?.code || 'BACKEND_ERROR';
    throw error;
  }

  return payload;
}

export async function requestAIMembershipStatusFromBackend({ chart, profile, userKey }) {
  const { baseUrl, authToken } = getAIBackendConfig();
  if (!baseUrl) {
    throw new Error('Missing backend URL. Fill expo.extra.aiBackendUrl in app.json.');
  }

  const endpoint = `${baseUrl.replace(/\/$/, '')}/api/ai/membership-status`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { 'X-MingMe-Token': authToken } : {}),
    },
    body: JSON.stringify({ chart, profile, userKey }),
  });

  const payload = await response.json();
  if (!response.ok) {
    const error = new Error(payload?.error || `Backend membership status failed: HTTP ${response.status}`);
    error.status = response.status;
    error.code = payload?.code || 'BACKEND_ERROR';
    throw error;
  }

  return payload;
}

export async function requestRegistrationTrialFromBackend({
  chart,
  profile,
  userKey,
  registration,
}) {
  const { baseUrl, authToken, signingSecret, retryCount, retryDelayMs } = getAIBackendConfig();
  if (!baseUrl) {
    throw new Error('Missing backend URL. Fill expo.extra.aiBackendUrl in app.json.');
  }

  const endpoint = `${baseUrl.replace(/\/$/, '')}/api/ai/registration-trial`;
  const requestBody = JSON.stringify({ chart, profile, userKey, registration });
  return requestWithRetry(endpoint, requestBody, { authToken, signingSecret, retryCount, retryDelayMs });
}

export async function requestAITranscriptionFromBackend({
  uri,
  mimeType = 'audio/m4a',
  fileName = 'mingme-voice.m4a',
  language = 'zh',
  prompt = '',
  model = 'whisper-1',
}) {
  const { baseUrl, authToken } = getAIBackendConfig();
  if (!baseUrl) {
    throw new Error('Missing backend URL. Fill expo.extra.aiBackendUrl in app.json.');
  }
  if (!uri) {
    throw new Error('Missing audio file for transcription.');
  }

  const endpoint = `${baseUrl.replace(/\/$/, '')}/api/ai/transcribe`;
  const formData = new FormData();
  formData.append('language', language);
  formData.append('model', model);
  if (prompt) formData.append('prompt', prompt);
  formData.append('fileName', fileName);
  formData.append('mimeType', mimeType);
  formData.append('file', {
    uri,
    name: fileName,
    type: mimeType,
  });

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      ...(authToken ? { 'X-MingMe-Token': authToken } : {}),
    },
    body: formData,
  });

  const payload = await response.json();
  if (!response.ok) {
    const error = new Error(payload?.error || `Backend transcription failed: HTTP ${response.status}`);
    error.status = response.status;
    error.code = payload?.code || 'BACKEND_ERROR';
    throw error;
  }

  return payload;
}

export async function requestPaywallLeadFromBackend({
  registration,
  selectedPlan,
  profile,
  userKey,
  chart,
  source = 'web_paywall',
}) {
  const { baseUrl, authToken, signingSecret, retryCount, retryDelayMs } = getAIBackendConfig();
  if (!baseUrl) {
    throw new Error('Missing backend URL. Fill expo.extra.aiBackendUrl in app.json.');
  }

  const endpoint = `${baseUrl.replace(/\/$/, '')}/api/ai/paywall-lead`;
  const requestBody = JSON.stringify({
    registration,
    selectedPlan,
    profile,
    userKey,
    chart,
    source,
  });

  return requestWithRetry(endpoint, requestBody, { authToken, signingSecret, retryCount, retryDelayMs });
}

export async function requestManualPaymentReviewFromBackend({
  registration,
  selectedPlan,
  paymentMethod,
  amountText,
  paidAtText,
  screenshotName,
  screenshotDataUrl,
  notes,
  profile,
  userKey,
  chart,
  source = 'web_manual_payment',
}) {
  const { baseUrl, authToken, signingSecret, retryCount, retryDelayMs } = getAIBackendConfig();
  if (!baseUrl) {
    throw new Error('Missing backend URL. Fill expo.extra.aiBackendUrl in app.json.');
  }

  const endpoint = `${baseUrl.replace(/\/$/, '')}/api/ai/manual-payment-review`;
  const requestBody = JSON.stringify({
    registration,
    selectedPlan,
    paymentMethod,
    amountText,
    paidAtText,
    screenshotName,
    screenshotDataUrl,
    notes,
    profile,
    userKey,
    chart,
    source,
  });

  return requestWithRetry(endpoint, requestBody, { authToken, signingSecret, retryCount, retryDelayMs });
}

export async function requestContactMingjiFromBackend({
  registration,
  topic,
  message,
  profile,
  userKey,
  chart,
  source = 'member_contact',
}) {
  const { baseUrl, authToken, signingSecret, retryCount, retryDelayMs } = getAIBackendConfig();
  if (!baseUrl) {
    throw new Error('Missing backend URL. Fill expo.extra.aiBackendUrl in app.json.');
  }

  const endpoint = `${baseUrl.replace(/\/$/, '')}/api/ai/contact-mingji`;
  const requestBody = JSON.stringify({
    registration,
    topic,
    message,
    profile,
    userKey,
    chart,
    source,
  });

  return requestWithRetry(endpoint, requestBody, { authToken, signingSecret, retryCount, retryDelayMs });
}

export async function requestCreatePaymentOrderFromBackend({
  userKey,
  chart,
  profile,
  productCode,
  channelPreference = 'auto',
  clientScene = 'mobile_h5',
  inWechat = false,
  returnUrl = '',
  source = 'web_paywall',
  metadata,
}) {
  const { baseUrl, authToken, signingSecret, retryCount, retryDelayMs } = getAIBackendConfig();
  if (!baseUrl) {
    throw new Error('Missing backend URL. Fill expo.extra.aiBackendUrl in app.json.');
  }

  const endpoint = `${baseUrl.replace(/\/$/, '')}/api/pay/create-order`;
  const requestBody = JSON.stringify({
    userKey,
    chart,
    profile,
    productCode,
    channelPreference,
    clientScene,
    inWechat,
    returnUrl,
    source,
    metadata,
  });

  return requestWithRetry(endpoint, requestBody, { authToken, signingSecret, retryCount, retryDelayMs });
}

export async function requestPaymentOrderStatusFromBackend({ orderId }) {
  const { baseUrl, authToken } = getAIBackendConfig();
  if (!baseUrl) {
    throw new Error('Missing backend URL. Fill expo.extra.aiBackendUrl in app.json.');
  }
  if (!orderId) {
    throw new Error('Missing orderId.');
  }

  const endpoint = `${baseUrl.replace(/\/$/, '')}/api/pay/order/${encodeURIComponent(orderId)}`;
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      ...(authToken ? { 'X-MingMe-Token': authToken } : {}),
    },
  });

  const payload = await response.json();
  if (!response.ok) {
    const error = new Error(payload?.error || `Backend order query failed: HTTP ${response.status}`);
    error.status = response.status;
    error.code = payload?.code || 'BACKEND_ERROR';
    throw error;
  }

  return payload;
}
