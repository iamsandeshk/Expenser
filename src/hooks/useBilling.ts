import 'cordova-plugin-purchase';

import { Capacitor } from '@capacitor/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  buildSubscriptionRecordFromVerifiedPurchase,
  getProductIdForPlan,
  pickBestVerifiedPurchase,
  type BillingProductState,
  type ProPlanId,
} from '@/lib/proSubscription';
import { saveProSubscriptionForCurrentUser } from '@/integrations/firebase/proSubscription';
import { getCurrentGoogleUser, subscribeGoogleAuth } from '@/integrations/firebase/auth';

const PRODUCT_META: Array<{ plan: ProPlanId; productId: string; name: string; type: CdvPurchase.ProductType; }> = [
  { plan: 'monthly', productId: 'pro_monthly', name: 'SplitMate Pro - Monthly', type: CdvPurchase.ProductType.PAID_SUBSCRIPTION },
  { plan: 'yearly', productId: 'pro_yearly', name: 'SplitMate Pro - Yearly', type: CdvPurchase.ProductType.PAID_SUBSCRIPTION },
  { plan: 'lifetime', productId: 'pro_lifetime', name: 'SplitMate Pro - Lifetime', type: CdvPurchase.ProductType.NON_CONSUMABLE },
];

type BillingProduct = BillingProductState;

const PRO_SUBSCRIPTION_REFRESH_EVENT = 'splitmate-pro-subscription-updated';
const AUTH_WAIT_TIMEOUT_MS = 15000;

function getStore() {
  const store = window.CdvPurchase?.store;
  if (!store) {
    throw new Error('In-app purchase store is not available yet.');
  }
  return store as typeof CdvPurchase.store;
}

function getLocalizedPrice(product?: CdvPurchase.Product) {
  return product?.pricing?.price ?? product?.getOffer()?.pricingPhases?.[0]?.price ?? null;
}

function createInitialProducts(): BillingProduct[] {
  return PRODUCT_META.map((item) => ({
    plan: item.plan,
    productId: item.productId,
    name: item.name,
    localizedPrice: null,
    loading: true,
  }));
}

function notifyProSubscriptionChanged() {
  window.dispatchEvent(new Event(PRO_SUBSCRIPTION_REFRESH_EVENT));
}

function waitForCurrentGoogleUser(timeoutMs = AUTH_WAIT_TIMEOUT_MS) {
  const currentUser = getCurrentGoogleUser();
  if (currentUser) {
    return Promise.resolve(currentUser);
  }

  return new Promise<NonNullable<ReturnType<typeof getCurrentGoogleUser>>>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      unsubscribe();
      reject(new Error('Firebase Auth user was not ready before the purchase callback completed. Please sign in again and retry.'));
    }, timeoutMs);

    const unsubscribe = subscribeGoogleAuth((user) => {
      if (!user) {
        return;
      }

      window.clearTimeout(timeoutId);
      unsubscribe();
      resolve(user);
    });
  });
}

export function useBilling() {
  const [products, setProducts] = useState<BillingProduct[]>(() => createInitialProducts());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initializedRef = useRef(false);

  const syncProducts = useCallback(() => {
    if (!Capacitor.isNativePlatform() || !window.CdvPurchase?.store) {
      setProducts(createInitialProducts().map((item) => ({ ...item, loading: false })));
      return;
    }

    const store = getStore();
    setProducts(PRODUCT_META.map((item) => {
      const product = store.get(item.productId, CdvPurchase.Platform.GOOGLE_PLAY) ?? store.get(item.productId);
      return {
        plan: item.plan,
        productId: item.productId,
        name: item.name,
        localizedPrice: getLocalizedPrice(product),
        loading: !product?.pricing?.price,
        product,
      };
    }));
  }, []);

  const syncBestVerifiedPurchase = useCallback(async (restoredAt: string | null) => {
    const store = getStore();
    const bestPurchase = pickBestVerifiedPurchase(store.verifiedPurchases);
    if (!bestPurchase) return false;

    const record = buildSubscriptionRecordFromVerifiedPurchase(bestPurchase, restoredAt);
    if (!record) return false;

    await saveProSubscriptionForCurrentUser(record);
    return true;
  }, []);

  const initBilling = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) {
      setLoading(false);
      setProducts(createInitialProducts().map((item) => ({ ...item, loading: false })));
      return;
    }

    const store = getStore();

    if (initializedRef.current) {
      syncProducts();
      setLoading(false);
      return;
    }

    initializedRef.current = true;

    const validatorUrl = (import.meta.env.VITE_PRO_SUBSCRIPTION_VALIDATOR_URL as string | undefined)?.trim();
    if (validatorUrl) {
      store.validator = validatorUrl;
    }

    store.when()
      .approved((transaction) => {
        void transaction.verify().catch((purchaseError) => {
          setError((purchaseError as Error).message || 'Purchase verification failed.');
        });
      }, 'splitmate_pro_approved')
      .verified((receipt) => {
        void (async () => {
          try {
            const bestPurchase = pickBestVerifiedPurchase(receipt.collection);
            if (!bestPurchase) {
              setError('No verified purchase was found.');
              return;
            }

            const record = buildSubscriptionRecordFromVerifiedPurchase(bestPurchase, null);
            if (!record) {
              setError('Purchase did not match a Pro plan.');
              return;
            }

            await waitForCurrentGoogleUser();
            await saveProSubscriptionForCurrentUser(record);
            await receipt.finish();
            notifyProSubscriptionChanged();
            syncProducts();
          } catch (purchaseError) {
            setError((purchaseError as Error).message || 'Unable to save purchase.');
          }
        })();
      }, 'splitmate_pro_verified')
      .unverified((response) => {
        const message = (response as { message?: string } | null)?.message || 'Purchase could not be verified.';
        setError(message);
      }, 'splitmate_pro_unverified');

    PRODUCT_META.forEach((item) => {
      store.register({
        id: item.productId,
        type: item.type,
        platform: CdvPurchase.Platform.GOOGLE_PLAY,
      });
    });

    await store.initialize([CdvPurchase.Platform.GOOGLE_PLAY]);
    await store.update();
    syncProducts();
    setLoading(false);
  }, [syncProducts]);

  useEffect(() => {
    void initBilling();
  }, [initBilling]);

  const purchasePlan = useCallback(async (plan: ProPlanId) => {
    if (!Capacitor.isNativePlatform()) {
      throw new Error('Purchases are available on Android devices only.');
    }

    const store = getStore();
    const productId = getProductIdForPlan(plan);
    const product = store.get(productId, CdvPurchase.Platform.GOOGLE_PLAY) ?? store.get(productId);
    const offer = product?.getOffer();

    if (!product || !offer) {
      throw new Error('This plan is not available yet.');
    }

    const orderError = await offer.order();
    if (orderError) {
      if ((orderError as any)?.code === CdvPurchase.ErrorCode.PAYMENT_CANCELLED) {
        return;
      }

      throw new Error((orderError as { message?: string } | null)?.message || 'Purchase failed.');
    }

    await store.update();
  }, []);

  const purchaseMonthly = useCallback(() => purchasePlan('monthly'), [purchasePlan]);
  const purchaseYearly = useCallback(() => purchasePlan('yearly'), [purchasePlan]);
  const purchaseLifetime = useCallback(() => purchasePlan('lifetime'), [purchasePlan]);

  const restorePurchases = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) {
      throw new Error('Restore purchases is available on Android devices only.');
    }

    const store = getStore();
    await store.restorePurchases();
    await store.update();
    syncProducts();

    const restored = await syncBestVerifiedPurchase(new Date().toISOString());
    if (restored) {
      notifyProSubscriptionChanged();
    }

    return restored;
  }, [syncBestVerifiedPurchase, syncProducts]);

  return useMemo(() => ({
    products,
    purchaseMonthly,
    purchaseYearly,
    purchaseLifetime,
    restorePurchases,
    loading,
    error,
  }), [error, loading, products, purchaseLifetime, purchaseMonthly, purchaseYearly, restorePurchases]);
}
