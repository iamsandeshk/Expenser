import { createContext, type PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { subscribeGoogleAuth } from '@/integrations/firebase/auth';
import {
  expireProSubscriptionForCurrentUser,
  loadProSubscriptionForCurrentUser,
  subscribeToProSubscriptionForCurrentUser,
} from '@/integrations/firebase/proSubscription';
import {
  isProSubscriptionActive,
  type ProPlanId,
  type ProSubscriptionRecord,
} from '@/lib/proSubscription';
import { setProStatusCache } from '@/lib/proAccess';

const PRO_SUBSCRIPTION_REFRESH_EVENT = 'splitmate-pro-subscription-updated';

type ProContextValue = {
  isPro: boolean;
  plan: ProPlanId | null;
  loading: boolean;
  subscription: ProSubscriptionRecord | null;
};

const ProContext = createContext<ProContextValue | null>(null);

export function ProContextProvider({ children }: PropsWithChildren) {
  const [subscription, setSubscription] = useState<ProSubscriptionRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let unsubscribeSubscription = () => {};

    const applySubscription = (record: ProSubscriptionRecord | null) => {
      if (!isMounted) {
        return;
      }

      if (!record) {
        setSubscription(null);
        setLoading(false);
        setProStatusCache(false, null);
        return;
      }

      if (!isProSubscriptionActive(record) && record.plan !== 'lifetime') {
        void expireProSubscriptionForCurrentUser().catch(() => {});
      }

      setSubscription(record);
      setLoading(false);
      setProStatusCache(isProSubscriptionActive(record), record.plan);
    };

    const refreshSubscription = () => {
      void loadProSubscriptionForCurrentUser()
        .then((record) => {
          applySubscription(record);
        })
        .catch(() => {
          applySubscription(null);
        });
    };

    const handleSubscriptionRefresh = () => {
      refreshSubscription();
    };

    window.addEventListener(PRO_SUBSCRIPTION_REFRESH_EVENT, handleSubscriptionRefresh);

    const unsubscribeAuth = subscribeGoogleAuth((user) => {
      unsubscribeSubscription();
      unsubscribeSubscription = () => {};

      if (!user) {
        applySubscription(null);
        return;
      }

      unsubscribeSubscription = subscribeToProSubscriptionForCurrentUser((record) => {
        applySubscription(record);
      });

      refreshSubscription();
    });

    return () => {
      isMounted = false;
      window.removeEventListener(PRO_SUBSCRIPTION_REFRESH_EVENT, handleSubscriptionRefresh);
      unsubscribeSubscription();
      unsubscribeAuth();
    };
  }, []);

  const value = useMemo<ProContextValue>(() => ({
    isPro: isProSubscriptionActive(subscription),
    plan: subscription?.plan ?? null,
    loading,
    subscription,
  }), [loading, subscription]);

  return <ProContext.Provider value={value}>{children}</ProContext.Provider>;
}

export function useProGate() {
  const context = useContext(ProContext);
  if (!context) {
    throw new Error('useProGate must be used within ProContextProvider.');
  }

  return {
    isPro: context.isPro,
    plan: context.plan,
    loading: context.loading,
  };
}

export type { ProContextValue };
