import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import MingMeV2App from './src/v2/MingMeV2App';
import { ensurePwaHead, registerPwaServiceWorker, trackPwaEvent } from './src/utils/pwaWeb';

export default function App() {
  useEffect(() => {
    ensurePwaHead();
    registerPwaServiceWorker();
    trackPwaEvent('landing_view', { source: 'app_boot' });
  }, []);

  return <MingMeV2App />;
}
