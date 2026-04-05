import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import MingMeV2App from './src/v2/MingMeV2App';
import { ensurePwaHead, forcePwaRefresh, registerPwaServiceWorker, trackPwaEvent } from './src/utils/pwaWeb';

ensurePwaHead();
registerPwaServiceWorker();

function shouldTriggerPwaRecovery(errorLike) {
  const message =
    typeof errorLike === 'string'
      ? errorLike
      : errorLike?.message || errorLike?.reason?.message || `${errorLike?.reason || errorLike || ''}`;
  const normalized = `${message || ''}`.toLowerCase();
  return (
    normalized.includes('loading chunk') ||
    normalized.includes('chunkloaderror') ||
    normalized.includes('dynamically imported module') ||
    normalized.includes('failed to fetch dynamically imported module') ||
    normalized.includes('importing a module script failed') ||
    normalized.includes('unexpected token') ||
    normalized.includes('script error')
  );
}

if (typeof window !== 'undefined') {
  const recoverOnce = () => forcePwaRefresh().catch(() => undefined);
  window.addEventListener(
    'error',
    (event) => {
      if (shouldTriggerPwaRecovery(event?.error || event?.message)) {
        recoverOnce();
      }
    },
    { once: true }
  );
  window.addEventListener(
    'unhandledrejection',
    (event) => {
      if (shouldTriggerPwaRecovery(event?.reason)) {
        recoverOnce();
      }
    },
    { once: true }
  );
}

class MingMeErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { crashed: false };
  }

  componentDidCatch() {
    this.setState({ crashed: true });
    forcePwaRefresh().catch(() => undefined);
  }

  render() {
    if (this.state.crashed) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#F2F2F7' }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#1C1C1E', textAlign: 'center' }}>正在更新明己AI先生</Text>
          <Text style={{ marginTop: 10, fontSize: 14, lineHeight: 22, color: 'rgba(28,28,30,0.72)', textAlign: 'center' }}>
            系统正在自动刷新到最新版，请稍等片刻。
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  useEffect(() => {
    trackPwaEvent('landing_view', { source: 'app_boot' });
  }, []);

  return (
    <MingMeErrorBoundary>
      <MingMeV2App />
    </MingMeErrorBoundary>
  );
}
