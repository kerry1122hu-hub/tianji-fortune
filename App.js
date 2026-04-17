import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { Platform, Text, View } from 'react-native';
import MingSkyNativeApp from './src/v2/MingMeV2App';
import InterpretationWebApp from './src/payment/InterpretationWebApp';
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

class MingSkyErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { crashed: false, upgradeRecovery: false, errorMessage: '', componentStack: '' };
  }

  componentDidCatch(error, info) {
    const upgradeRecovery = shouldTriggerPwaRecovery(error);
    const errorMessage = `${error?.message || error || ''}`.trim();
    const componentStack = `${info?.componentStack || ''}`.trim();
    this.setState({ crashed: true, upgradeRecovery, errorMessage, componentStack });
    console.error('MingSkyErrorBoundary caught:', error, info);
    if (upgradeRecovery) {
      forcePwaRefresh().catch(() => undefined);
    }
  }

  render() {
    if (this.state.crashed) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#F2F2F7' }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#1C1C1E', textAlign: 'center' }}>
            {this.state.upgradeRecovery ? '正在更新 MingSky Astrology' : 'MingSky Astrology 需要稍微缓一下'}
          </Text>
          <Text style={{ marginTop: 10, fontSize: 14, lineHeight: 22, color: 'rgba(28,28,30,0.72)', textAlign: 'center' }}>
            {this.state.upgradeRecovery
              ? '系统正在自动刷新到最新版本，请稍等片刻。'
              : '刚才这次访问触发了页面异常。返回后再试一次就好，我们已经把升级刷新和普通错误分开处理了。'}
          </Text>
          {!this.state.upgradeRecovery && this.state.errorMessage ? (
            <Text style={{ marginTop: 12, fontSize: 12, lineHeight: 18, color: 'rgba(28,28,30,0.55)', textAlign: 'center' }}>
              错误摘要：{this.state.errorMessage}
            </Text>
          ) : null}
          {!this.state.upgradeRecovery && this.state.componentStack ? (
            <Text style={{ marginTop: 8, fontSize: 11, lineHeight: 16, color: 'rgba(28,28,30,0.42)', textAlign: 'center' }}>
              组件栈：{this.state.componentStack.replace(/\s+/g, ' ').slice(0, 260)}
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
    <MingSkyErrorBoundary>
      {Platform.OS === 'web' ? <InterpretationWebApp /> : <MingSkyNativeApp />}
    </MingSkyErrorBoundary>
  );
}
