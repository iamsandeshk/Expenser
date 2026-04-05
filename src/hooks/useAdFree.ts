import { useState, useEffect } from 'react';
import { useProGate } from '@/hooks/useProGate';
import { isProUserCached } from '@/lib/proAccess';

/**
 * useAdFree
 * Custom hook to manage the 24-hour ad-free state unlocked via rewarded ads.
 */
export const useAdFree = () => {
  const { isPro } = useProGate();
  const [isAdFree, setIsAdFree] = useState(() => {
    const rawUntil = localStorage.getItem('ad_free_until');
    if (!rawUntil) return false;
    return parseInt(rawUntil, 10) > Date.now();
  });
  const [remainingTime, setRemainingTime] = useState('');

  const updateState = () => {
    if (isPro || isProUserCached()) {
      setIsAdFree(true);
      setRemainingTime('Pro');
      return;
    }

    const rawUntil = localStorage.getItem('ad_free_until');
    if (!rawUntil) {
      setIsAdFree(false);
      setRemainingTime('');
      return;
    }

    const until = parseInt(rawUntil, 10);
    const now = Date.now();
    
    if (now < until) {
      setIsAdFree(true);
      const diff = until - now;
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setRemainingTime(`${hours}h ${minutes}m`);
    } else {
      setIsAdFree(false);
      setRemainingTime('');
      // Optionally clean up expired record
      localStorage.removeItem('ad_free_until');
    }
  };

  useEffect(() => {
    updateState();
    
    // Refresh state when ads status changes globally
    window.addEventListener('splitmate_ads_changed', updateState);
    window.addEventListener('splitmate_pro_changed', updateState);
    
    // Interval to update countdown
    const interval = setInterval(updateState, 60000); // every minute

    return () => {
      window.removeEventListener('splitmate_ads_changed', updateState);
      window.removeEventListener('splitmate_pro_changed', updateState);
      clearInterval(interval);
    };
  }, [isPro]);

  const adFreeUntil = localStorage.getItem('ad_free_until') ? parseInt(localStorage.getItem('ad_free_until')!, 10) : 0;

  return { isAdFree, remainingTime, adFreeUntil };
};
