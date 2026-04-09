import { toast } from 'sonner';

export const PRO_STATUS_CACHE_KEY = 'splitmate_pro_status_cache';
export const PRO_LIMIT_BLOCKED_EVENT = 'splitmate_pro_limit_blocked';
export const PRO_OVERRIDE_KEY = 'splitmate_pro_override';
export const DEV_OVERRIDE_EMAILS = ['try.sandeshk@gmail.com', 'sandeshkullolli4@gmail.com'];

export type ProLimitFeature =
  | 'persons'
  | 'groups'
  | 'transactions'
  | 'accounts'
  | 'links'
  | 'link-groups'
  | 'goals'
  | 'loans'
  | 'subscriptions'
  | 'collaboration'
  | 'backup'
  | 'restore'
  | 'auto-backup';

type ProStatusCache = {
  isPro: boolean;
  plan?: string | null;
  endDate?: string | null;
  updatedAt: number;
};

type ProOverride = 'on' | null;

let proStatusCache: ProStatusCache = {
  isPro: false,
  plan: null,
  endDate: null,
  updatedAt: 0,
};

function readProStatusCacheFromStorage(): ProStatusCache {
  if (typeof window === 'undefined') {
    return { ...proStatusCache };
  }

  try {
    const raw = window.localStorage.getItem(PRO_STATUS_CACHE_KEY);
    if (!raw) return { ...proStatusCache };

    const parsed = JSON.parse(raw) as Partial<ProStatusCache>;
    return {
      isPro: Boolean(parsed.isPro),
      plan: parsed.plan ?? null,
      endDate: parsed.endDate ?? null,
      updatedAt: Number.isFinite(parsed.updatedAt as number) ? Number(parsed.updatedAt) : 0,
    };
  } catch {
    return { ...proStatusCache };
  }
}

function writeProStatusCacheToStorage(cache: ProStatusCache): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (!cache.isPro) {
    window.localStorage.removeItem(PRO_STATUS_CACHE_KEY);
    return;
  }

  window.localStorage.setItem(PRO_STATUS_CACHE_KEY, JSON.stringify(cache));
}

proStatusCache = readProStatusCacheFromStorage();

function readProOverrideFromStorage(): ProOverride {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(PRO_OVERRIDE_KEY) === 'on' ? 'on' : null;
}

function writeProOverrideToStorage(override: ProOverride): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (override === 'on') {
    window.localStorage.setItem(PRO_OVERRIDE_KEY, 'on');
    return;
  }

  window.localStorage.removeItem(PRO_OVERRIDE_KEY);
}

let proOverride: ProOverride = readProOverrideFromStorage();

export function isDevOverrideEmail(email?: string | null): boolean {
  if (!email) {
    return false;
  }

  return DEV_OVERRIDE_EMAILS.includes(email.toLowerCase());
}

export function setProStatusCache(isPro: boolean, plan?: string | null, endDate?: string | null): void {
  proStatusCache = {
    isPro,
    plan: plan ?? null,
    endDate: endDate ?? null,
    updatedAt: Date.now(),
  };

  writeProStatusCacheToStorage(proStatusCache);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('splitmate_pro_changed'));
  }
}

export function getProStatusCache(): ProStatusCache {
  if (!proStatusCache.isPro) {
    return { ...proStatusCache };
  }

  if (proStatusCache.endDate) {
    const endTime = new Date(proStatusCache.endDate).getTime();
    if (Number.isFinite(endTime) && endTime <= Date.now()) {
      clearProStatusCache();
      return { isPro: false, plan: null, endDate: null, updatedAt: 0 };
    }
  }

  return { ...proStatusCache };
}

export function isProUserCached(): boolean {
  const override = getProOverride();
  if (override === 'on') return false;

  return Boolean(getProStatusCache().isPro);
}

export function getProOverride(): ProOverride {
  return proOverride;
}

export function setProOverride(override: ProOverride): void {
  proOverride = override;
  writeProOverrideToStorage(override);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('splitmate_pro_changed'));
  }
}

export function clearProStatusCache(): void {
  proStatusCache = { isPro: false, plan: null, endDate: null, updatedAt: 0 };
  writeProStatusCacheToStorage(proStatusCache);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('splitmate_pro_changed'));
  }
}

export function resetProStatusCache(): void {
  proStatusCache = { isPro: false, plan: null, endDate: null, updatedAt: 0 };
  proOverride = null;
  writeProOverrideToStorage(null);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('splitmate_pro_changed'));
  }
}

export function requestProUpgrade(feature: ProLimitFeature, description: string): void {
  toast('Pro feature limit reached', {
    description,
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(PRO_LIMIT_BLOCKED_EVENT, {
        detail: { feature, description },
      }),
    );
  }
}
