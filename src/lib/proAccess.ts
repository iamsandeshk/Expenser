import { toast } from 'sonner';

export const PRO_STATUS_CACHE_KEY = 'splitmate_pro_status_cache';
export const PRO_LIMIT_BLOCKED_EVENT = 'splitmate_pro_limit_blocked';
export const PRO_OVERRIDE_KEY = 'splitmate_pro_override';

export type ProLimitFeature =
  | 'persons'
  | 'groups'
  | 'transactions'
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
  updatedAt: number;
};

type ProOverride = 'on' | 'off';

export function setProStatusCache(isPro: boolean, plan?: string | null): void {
  const payload: ProStatusCache = {
    isPro,
    plan: plan ?? null,
    updatedAt: Date.now(),
  };

  localStorage.setItem(PRO_STATUS_CACHE_KEY, JSON.stringify(payload));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('splitmate_pro_changed'));
  }
}

export function isProUserCached(): boolean {
  const override = getProOverride();
  if (override === 'on') return true;
  if (override === 'off') return false;

  try {
    const raw = localStorage.getItem(PRO_STATUS_CACHE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as Partial<ProStatusCache>;
    return Boolean(parsed?.isPro);
  } catch {
    return false;
  }
}

export function getProOverride(): ProOverride | null {
  const raw = localStorage.getItem(PRO_OVERRIDE_KEY);
  if (raw === 'on' || raw === 'off') return raw;
  return null;
}

export function setProOverride(override: ProOverride): void {
  localStorage.setItem(PRO_OVERRIDE_KEY, override);
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
