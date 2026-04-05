import { registerPlugin } from '@capacitor/core';

export interface NativeAdInfo {
  loaded: boolean;
  headline?: string;
  body?: string;
  callToAction?: string;
  advertiser?: string;
  hasIcon?: boolean;
  icon?: string;
  error?: string;
}

export interface NativeAdPlugin {
  loadAd(): Promise<NativeAdInfo>;
  showAd(): Promise<NativeAdInfo & { shown: boolean }>;
  destroyAd(): Promise<void>;
  recordAdClick(): Promise<void>;
}

const NativeAd = registerPlugin<NativeAdPlugin>('NativeAd', {
  web: {
    async loadAd(): Promise<NativeAdInfo> {
      // Web fallback - return mock data for development
      console.log('[NativeAd] Web fallback: simulating ad load');
      return {
        loaded: true,
        headline: 'Track your finances smarter',
        body: 'Join millions who manage money better every day.',
        callToAction: 'Get Started',
        advertiser: 'FinanceApp',
        hasIcon: false,
      };
    },
    async showAd(): Promise<NativeAdInfo & { shown: boolean }> {
      return {
        shown: true,
        loaded: true,
        headline: 'Track your finances smarter',
        body: 'Join millions who manage money better every day.',
        callToAction: 'Get Started',
        advertiser: 'FinanceApp',
        hasIcon: false,
      };
    },
    async destroyAd(): Promise<void> {},
    async recordAdClick(): Promise<void> {},
  },
});

export { NativeAd };
