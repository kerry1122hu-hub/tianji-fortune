import Constants from 'expo-constants';

function getExtraConfig() {
  return (
    Constants.expoConfig?.extra ||
    Constants.manifest2?.extra ||
    Constants.manifest?.extra ||
    {}
  );
}

export function getOpenAIConfig() {
  const extra = getExtraConfig();

  return {
    apiKey: extra.openaiApiKey || '',
    baseUrl: extra.openaiBaseUrl || 'https://api.openai.com/v1',
    model: extra.openaiModel || 'gpt-5',
  };
}

export function hasOpenAIConfig() {
  return Boolean(getOpenAIConfig().apiKey);
}

function buildHeaders(apiKey) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };
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

export async function requestOpenAIText({
  instructions,
  input,
  model,
  maxOutputTokens = 1600,
  reasoning,
}) {
  const config = getOpenAIConfig();

  if (!config.apiKey) {
    throw new Error('Missing OpenAI API key. Fill expo.extra.openaiApiKey in app.json.');
  }

  const endpoint = `${config.baseUrl.replace(/\/$/, '')}/responses`;
  const body = {
    model: model || config.model,
    input,
    max_output_tokens: maxOutputTokens,
  };

  if (instructions) {
    body.instructions = instructions;
  }

  if (reasoning) {
    body.reasoning = reasoning;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: buildHeaders(config.apiKey),
    body: JSON.stringify(body),
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error?.message || `OpenAI request failed: HTTP ${response.status}`);
  }

  return {
    text: extractOutputText(payload),
    raw: payload,
  };
}

export async function requestOpenAIAudioTranscription({
  uri,
  mimeType = 'audio/m4a',
  fileName = 'mingme-voice.m4a',
  model = 'whisper-1',
  language = 'zh',
  prompt,
}) {
  const config = getOpenAIConfig();

  if (!config.apiKey) {
    throw new Error('Missing OpenAI API key. Fill expo.extra.openaiApiKey in app.json.');
  }

  if (!uri) {
    throw new Error('Missing audio file for transcription.');
  }

  const endpoint = `${config.baseUrl.replace(/\/$/, '')}/audio/transcriptions`;
  const formData = new FormData();
  formData.append('model', model);
  formData.append('language', language);
  if (prompt) {
    formData.append('prompt', prompt);
  }
  formData.append('file', {
    uri,
    name: fileName,
    type: mimeType,
  });

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: formData,
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error?.message || `OpenAI transcription failed: HTTP ${response.status}`);
  }

  return {
    text: (payload?.text || '').trim(),
    raw: payload,
  };
}
