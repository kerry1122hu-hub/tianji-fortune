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
    this.state = { crashed: false, upgradeRecovery: false, errorMessage: '' };
  }

  componentDidCatch(error) {
    const upgradeRecovery = shouldTriggerPwaRecovery(error);
    const errorMessage = `${error?.message || error || ''}`.trim();
    this.setState({ crashed: true, upgradeRecovery, errorMessage });
    console.error('MingMeErrorBoundary caught:', error);
    if (upgradeRecovery) {
      forcePwaRefresh().catch(() => undefined);
    }
  }

  render() {
    if (this.state.crashed) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#F2F2F7' }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#1C1C1E', textAlign: 'center' }}>
            {this.state.upgradeRecovery ? '正在更新明己AI先生' : '明己AI先生暂时需要缓一下'}
          </Text>
          <Text style={{ marginTop: 10, fontSize: 14, lineHeight: 22, color: 'rgba(28,28,30,0.72)', textAlign: 'center' }}>
            {this.state.upgradeRecovery
              ? '系统正在自动刷新到最新版，请稍等片刻。'
              : '刚才那次对话触发了页面异常。请返回后再试一次，我们已经把升级刷新和普通错误分开处理了。'}
          </Text>
          {!this.state.upgradeRecovery && this.state.errorMessage ? (
            <Text style={{ marginTop: 12, fontSize: 12, lineHeight: 18, color: 'rgba(28,28,30,0.55)', textAlign: 'center' }}>
              错误摘要：{this.state.errorMessage}
            </Text>
          ) : null}
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
