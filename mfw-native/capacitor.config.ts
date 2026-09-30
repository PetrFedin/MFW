import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // Investor placeholder. Final production bundle identifier must be approved
  // before Apple Developer provisioning and TestFlight signing.
  appId: 'com.mfw.investor.demo',
  appName: 'Moscow Fashion Week',
  webDir: '../mfw',
  ios: {
    contentInset: 'automatic',
    scrollEnabled: true,
    preferredContentMode: 'mobile'
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
};

export default config;
