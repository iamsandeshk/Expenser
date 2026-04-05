import { useEffect, useState } from 'react';
import { AdMob, BannerAdPosition, BannerAdSize } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { useAdFree } from '@/hooks/useAdFree';
import { getAdsEnabled } from '@/lib/storage';

/**
 * useBannerAd
 * Custom hook to show/refresh the banner ad on specific pages or modals.
 * Uses a singleton-like approach to prevent multiple banner overlap issues.
 */
let activeBannerCount = 0;
let isAdMobInitialized = false;
let isActuallyShowing = false;
let hideBannerTimeout: ReturnType<typeof setTimeout> | null = null;

const clearHideBannerTimeout = () => {
  if (hideBannerTimeout) {
    clearTimeout(hideBannerTimeout);
    hideBannerTimeout = null;
  }
};

const bannerOptions = {
  adId: "ca-app-pub-2635018944245510/2755499389",
  adSize: BannerAdSize.ADAPTIVE_BANNER,
  position: BannerAdPosition.BOTTOM_CENTER,
  margin: 0,
  isTesting: false,
};

// Shared function to show the banner reliably
const showBannerInternal = async () => {
  try {
    clearHideBannerTimeout();

    if (!isAdMobInitialized) {
      await AdMob.initialize().catch(() => {});
      isAdMobInitialized = true;
    }

    await AdMob.showBanner(bannerOptions).catch(() => {});
    isActuallyShowing = true;
  } catch (err) {
    console.warn('[useBannerAd] Error showing banner:', err);
  }
};

const hideBannerInternal = async () => {
  try {
    await AdMob.hideBanner().catch(() => {});
    await AdMob.removeBanner().catch(() => {});
    isActuallyShowing = false;
  } catch (err) {
    // Ignore
  }
};

export const useBannerAd = (active: boolean = true) => {
  const { isAdFree } = useAdFree();
  const [adsToggledOn, setAdsToggledOn] = useState(() => getAdsEnabled());

  useEffect(() => {
    // Listen for manual ad toggle changes in Settings
    const handleAdsChange = () => {
      const enabled = getAdsEnabled();
      setAdsToggledOn(enabled);
    };
    window.addEventListener('splitmate_ads_changed', handleAdsChange);

    // Listen for app resume to re-show banner if it was hidden by the OS
    const resumeListener = CapacitorApp.addListener('appRestoredResult', () => {
      if (active && !isAdFree && getAdsEnabled()) {
        showBannerInternal();
      }
    });

    return () => {
      window.removeEventListener('splitmate_ads_changed', handleAdsChange);
      resumeListener.then(l => l.remove());
    };
  }, [active, isAdFree]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || isAdFree || !adsToggledOn || !active) {
      // If we are on a page where banner should be hidden or ads are turned off
      if (active && (isAdFree || !adsToggledOn)) {
        hideBannerInternal();
      } else if (!active) {
        clearHideBannerTimeout();
        hideBannerTimeout = setTimeout(() => {
          if (activeBannerCount <= 0) {
            activeBannerCount = 0;
            hideBannerInternal();
          }
        }, 150);
      }
      return;
    }

    clearHideBannerTimeout();
    activeBannerCount++;
    showBannerInternal();

    return () => {
      activeBannerCount--;
      
      // Delay hiding to allow for smooth transitions between pages that both use banners
      clearHideBannerTimeout();
      hideBannerTimeout = setTimeout(() => {
        if (activeBannerCount <= 0) {
          activeBannerCount = 0;
          hideBannerInternal();
        }
      }, 400); // Slightly longer timeout for ultra-smooth transitions
    };
  }, [active, isAdFree, adsToggledOn]);
};
