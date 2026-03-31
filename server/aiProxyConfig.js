const path = require('path');

const ENV_PRESETS = {
  development: {
    port: 8787,
    allowOrigin: '*',
    rateLimitMax: 120,
    rateLimitWindowMs: 60 * 1000,
    requestTimeoutMs: 30 * 1000,
    upstreamRetries: 1,
    upstreamRetryDelayMs: 600,
    signingMaxSkewMs: 5 * 60 * 1000,
  },
  staging: {
    port: 8787,
    allowOrigin: '*',
    rateLimitMax: 60,
    rateLimitWindowMs: 60 * 1000,
    requestTimeoutMs: 25 * 1000,
    upstreamRetries: 2,
    upstreamRetryDelayMs: 700,
    signingMaxSkewMs: 5 * 60 * 1000,
  },
  production: {
    port: 8787,
    allowOrigin: '*',
    rateLimitMax: 30,
    rateLimitWindowMs: 60 * 1000,
    requestTimeoutMs: 20 * 1000,
    upstreamRetries: 3,
    upstreamRetryDelayMs: 800,
    signingMaxSkewMs: 5 * 60 * 1000,
  },
};

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function loadConfig() {
  const envName = process.env.APP_ENV || process.env.NODE_ENV || 'development';
  const preset = ENV_PRESETS[envName] || ENV_PRESETS.development;

  return {
    envName,
    port: toNumber(process.env.PORT, preset.port),
    openAIBaseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    openAIModel: process.env.OPENAI_MODEL || 'gpt-5',
    openAIApiKey: process.env.OPENAI_API_KEY || '',
    allowOrigin: process.env.ALLOW_ORIGIN || preset.allowOrigin,
    authToken: process.env.AI_PROXY_AUTH_TOKEN || '',
    signingSecret: process.env.AI_PROXY_SIGNING_SECRET || '',
    signingMaxSkewMs: toNumber(process.env.SIGNING_MAX_SKEW_MS, preset.signingMaxSkewMs),
    rateLimitMax: toNumber(process.env.RATE_LIMIT_MAX, preset.rateLimitMax),
    rateLimitWindowMs: toNumber(process.env.RATE_LIMIT_WINDOW_MS, preset.rateLimitWindowMs),
    requestTimeoutMs: toNumber(process.env.REQUEST_TIMEOUT_MS, preset.requestTimeoutMs),
    upstreamRetries: toNumber(process.env.UPSTREAM_RETRIES, preset.upstreamRetries),
    upstreamRetryDelayMs: toNumber(process.env.UPSTREAM_RETRY_DELAY_MS, preset.upstreamRetryDelayMs),
    logDir: process.env.LOG_DIR || path.join(__dirname, 'logs'),
  };
}

module.exports = {
  loadConfig,
};
