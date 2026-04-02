import { Platform } from 'react-native';
import { getAIBackendConfig } from '../services/aiBackendConnector';

const PWA_EVENTS_KEY = 'mingme.pwa.events';
const PWA_SESSION_KEY = 'mingme.pwa.session';
const PWA_REFRESH_GUARD_KEY = 'mingme.pwa.refresh.guard';
let deferredInstallPrompt = null;

function isBrowser() {
  return Platform.OS === 'web' && typeof window !== 'undefined' && typeof document !== 'undefined';
}

export function isStandalonePwa() {
  if (!isBrowser()) return false;
  return Boolean(
    window.matchMedia?.('(display-mode: standalone)')?.matches ||
    window.navigator?.standalone === true
  );
}

export function detectPwaPlatform() {
  if (!isBrowser()) return 'native';
  const ua = window.navigator.userAgent || '';
  const touchPoints = Number(window.navigator.maxTouchPoints || 0);
  const isDesktopIpad = /macintosh/i.test(ua) && touchPoints > 1;

  if (isDesktopIpad) return 'ios';
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  if (/android/i.test(ua)) return 'android';
  return 'desktop';
}

export function isSafariBrowser() {
  if (!isBrowser()) return false;
  const ua = window.navigator.userAgent || '';
  const touchPoints = Number(window.navigator.maxTouchPoints || 0);
  const isDesktopIpad = /macintosh/i.test(ua) && touchPoints > 1;
  if (isDesktopIpad) return true;
  return /safari/i.test(ua) && !/chrome|crios|android|edgios|fxios/i.test(ua);
}

export function getPwaDisplayMode() {
  if (!isBrowser()) return 'native';
  if (window.navigator?.standalone === true) return 'standalone';
  if (window.matchMedia?.('(display-mode: standalone)')?.matches) return 'standalone';
  if (window.matchMedia?.('(display-mode: minimal-ui)')?.matches) return 'minimal-ui';
  if (window.matchMedia?.('(display-mode: browser)')?.matches) return 'browser';
  return 'browser';
}

export function ensurePwaHead() {
  if (!isBrowser()) return;

  const ensureTag = (selector, factory) => {
    let node = document.head.querySelector(selector);
    if (!node) {
      node = factory();
      document.head.appendChild(node);
    }
    return node;
  };

  ensureTag('link[rel="manifest"]', () => {
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = '/manifest.json';
    return link;
  });

  ensureTag('meta[name="theme-color"]', () => {
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = '#0B1020';
    return meta;
  });

  ensureTag('meta[name="apple-mobile-web-app-capable"]', () => {
    const meta = document.createElement('meta');
    meta.name = 'apple-mobile-web-app-capable';
    meta.content = 'yes';
    return meta;
  });

  ensureTag('meta[name="apple-mobile-web-app-status-bar-style"]', () => {
    const meta = document.createElement('meta');
    meta.name = 'apple-mobile-web-app-status-bar-style';
    meta.content = 'black-translucent';
    return meta;
  });

  ensureTag('meta[name="apple-mobile-web-app-title"]', () => {
    const meta = document.createElement('meta');
    meta.name = 'apple-mobile-web-app-title';
    meta.content = 'MingMe';
    return meta;
  });

  ensureTag('link[rel="apple-touch-icon"]', () => {
    const link = document.createElement('link');
    link.rel = 'apple-touch-icon';
    link.href = '/icons/apple-touch-icon.png';
    return link;
  });
}

export function registerPwaServiceWorker() {
  if (!isBrowser() || !('serviceWorker' in navigator)) return;
  if (window.__mingmeSwRegistered) return;
  window.__mingmeSwRegistered = true;

  const handleControllerChange = () => {
    if (window.__mingmeSwReloading) return;
    window.__mingmeSwReloading = true;
    window.location.reload();
  };

  navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        registration.update?.().catch(() => undefined);

        const installWorker = registration.installing || registration.waiting;
        if (installWorker) {
          installWorker.postMessage?.({ type: 'SKIP_WAITING' });
        }

        registration.addEventListener('updatefound', () => {
          const nextWorker = registration.installing;
          if (!nextWorker) return;
          nextWorker.addEventListener('statechange', () => {
            if (nextWorker.state === 'installed' && navigator.serviceWorker.controller) {
              nextWorker.postMessage?.({ type: 'SKIP_WAITING' });
            }
          });
        });
      })
      .catch(() => undefined);
  });
}

export async function forcePwaRefresh() {
  if (!isBrowser()) return;
  if (window.sessionStorage.getItem(PWA_REFRESH_GUARD_KEY) === '1') return;
  window.sessionStorage.setItem(PWA_REFRESH_GUARD_KEY, '1');

  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister().catch(() => false)));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key).catch(() => false)));
    }
  } catch {
    // ignore cleanup errors
  }

  window.location.reload();
}

export function trackPwaEvent(name, payload = {}) {
  if (!isBrowser()) return;
  try {
    const event = {
      name,
      payload,
      timestamp: new Date().toISOString(),
    };
    const current = JSON.parse(window.localStorage.getItem(PWA_EVENTS_KEY) || '[]');
    current.push(event);
    window.localStorage.setItem(PWA_EVENTS_KEY, JSON.stringify(current.slice(-120)));
    postPwaEvent(event).catch(() => undefined);
  } catch {
    // ignore local storage failures
  }
}

function getSessionId() {
  if (!isBrowser()) return '';
  const existing = window.sessionStorage.getItem(PWA_SESSION_KEY);
  if (existing) return existing;
  const created = `pwa-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  window.sessionStorage.setItem(PWA_SESSION_KEY, created);
  return created;
}

async function postPwaEvent(event) {
  if (!isBrowser()) return;
  const { baseUrl, authToken } = getAIBackendConfig();
  if (!baseUrl) return;

  const endpoint = `${baseUrl.replace(/\/$/, '')}/api/ai/track-event`;
  const body = {
    eventName: event.name,
    eventSource: 'pwa',
    sessionId: getSessionId(),
    page: window.location.pathname || '/',
    platform: detectPwaPlatform(),
    payload: event.payload || {},
  };

  await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { 'X-MingMe-Token': authToken } : {}),
    },
    body: JSON.stringify(body),
    keepalive: true,
  });
}

export function listenToPwaInstallability({ onUpdate } = {}) {
  if (!isBrowser()) return () => undefined;

  const emit = () => {
    onUpdate?.({
      standalone: isStandalonePwa(),
      platform: detectPwaPlatform(),
      safari: isSafariBrowser(),
      displayMode: getPwaDisplayMode(),
      canPrompt: Boolean(deferredInstallPrompt),
    });
  };

  const handlePrompt = (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    trackPwaEvent('install_prompt_available', { platform: detectPwaPlatform() });
    emit();
  };

  const handleInstalled = () => {
    deferredInstallPrompt = null;
    trackPwaEvent('pwa_installed', { platform: detectPwaPlatform() });
    emit();
  };

  window.addEventListener('beforeinstallprompt', handlePrompt);
  window.addEventListener('appinstalled', handleInstalled);
  emit();

  return () => {
    window.removeEventListener('beforeinstallprompt', handlePrompt);
    window.removeEventListener('appinstalled', handleInstalled);
  };
}

export async function promptPwaInstall() {
  if (!deferredInstallPrompt) return false;
  deferredInstallPrompt.prompt();
  const choice = await deferredInstallPrompt.userChoice.catch(() => null);
  deferredInstallPrompt = null;
  trackPwaEvent('install_prompt_click', {
    outcome: choice?.outcome || 'dismissed',
    platform: detectPwaPlatform(),
  });
  return choice?.outcome === 'accepted';
}
