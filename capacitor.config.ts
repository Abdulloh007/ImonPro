import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'pro.imon.sohtmon',
  appName: 'imon-pro',
  webDir: 'dist',
  plugins: {
    CapacitorHttp: {
      enabled: true
    },
  },
  server: {
    androidScheme: 'http',
    cleartext: true,
  },
  android: {
    allowMixedContent: true
  }
};

export default config;
