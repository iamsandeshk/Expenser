export type ProPlanId = 'monthly' | 'yearly' | 'lifetime';

export interface ProSubscriptionRecord {
  isPro: boolean;
  plan: ProPlanId;
  startDate: string;
  endDate: string | null;
  purchaseToken: string;
  productId: string;
  isExpired: boolean;
  restoredAt: string | null;
}

export interface BillingProductState {
  plan: ProPlanId;
  productId: string;
  name: string;
  localizedPrice: string | null;
  loading: boolean;
  product?: CdvPurchase.Product;
}

export const PRO_PLAN_PRODUCTS: Record<ProPlanId, string> = {
  monthly: 'pro_monthly',
  yearly: 'pro_yearly',
  lifetime: 'pro_lifetime',
};

export const PRO_PLAN_LABELS: Record<ProPlanId, string> = {
  monthly: 'Monthly',
  yearly: 'Yearly',
  lifetime: 'Lifetime',
};

export const PRO_PLAN_DESCRIPTIONS: Record<ProPlanId, string> = {
  monthly: 'A flexible month-to-month subscription.',
  yearly: 'Best value for long-term access.',
  lifetime: 'One purchase, forever unlocked.',
};

export const PRO_PLAN_DURATION_DAYS: Record<Exclude<ProPlanId, 'lifetime'>, number> = {
  monthly: 30,
  yearly: 365,
};

const STORAGE_KEY = 'splitmate_pro_subscription';

function parseDate(value: string | null | undefined): number | null {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function addDays(base: Date, days: number) {
  return new Date(base.getTime() + (days * 24 * 60 * 60 * 1000));
}

export function getPlanIdFromProductId(productId: string): ProPlanId | null {
  if (productId === PRO_PLAN_PRODUCTS.monthly) return 'monthly';
  if (productId === PRO_PLAN_PRODUCTS.yearly) return 'yearly';
  if (productId === PRO_PLAN_PRODUCTS.lifetime) return 'lifetime';
  return null;
}

export function getProductIdForPlan(planId: ProPlanId): string {
  return PRO_PLAN_PRODUCTS[planId];
}

export function getPlanLabel(planId: ProPlanId): string {
  return PRO_PLAN_LABELS[planId];
}

export function getPlanDescription(planId: ProPlanId): string {
  return PRO_PLAN_DESCRIPTIONS[planId];
}

export function getPlanDurationDays(planId: ProPlanId): number | null {
  if (planId === 'lifetime') return null;
  return PRO_PLAN_DURATION_DAYS[planId];
}

export function getPlanEndDate(planId: ProPlanId, startDate: Date) {
  const durationDays = getPlanDurationDays(planId);
  return durationDays === null ? null : addDays(startDate, durationDays).toISOString();
}

export function isProSubscriptionActive(record: ProSubscriptionRecord | null | undefined, now = Date.now()): boolean {
  if (!record) return false;
  if (!record.isPro || record.isExpired) return false;
  const endDate = parseDate(record.endDate);
  return endDate === null ? true : endDate > now;
}

export function normalizeProSubscription(record: Partial<ProSubscriptionRecord> | null | undefined): ProSubscriptionRecord | null {
  if (!record?.plan || !record.productId || !record.startDate || !record.purchaseToken) return null;

  const startDate = new Date(record.startDate);
  const normalizedStartDate = Number.isFinite(startDate.getTime()) ? startDate.toISOString() : new Date().toISOString();
  const endDate = record.plan === 'lifetime'
    ? null
    : (record.endDate ? new Date(record.endDate).toISOString() : getPlanEndDate(record.plan, new Date(normalizedStartDate)));

  const normalized: ProSubscriptionRecord = {
    isPro: record.isPro ?? true,
    plan: record.plan,
    startDate: normalizedStartDate,
    endDate,
    purchaseToken: record.purchaseToken,
    productId: record.productId,
    isExpired: record.isExpired ?? false,
    restoredAt: record.restoredAt ?? null,
  };

  if (normalized.plan !== 'lifetime' && normalized.endDate) {
    const endTime = parseDate(normalized.endDate);
    if (endTime !== null && endTime <= Date.now()) {
      normalized.isPro = false;
      normalized.isExpired = true;
    }
  }

  return normalized;
}

export function buildSubscriptionRecordFromVerifiedPurchase(purchase: CdvPurchase.VerifiedPurchase, restoredAt: string | null = null): ProSubscriptionRecord | null {
  const plan = getPlanIdFromProductId(purchase.id);
  if (!plan) return null;

  const startDate = new Date(purchase.purchaseDate ?? Date.now()).toISOString();
  return normalizeProSubscription({
    isPro: true,
    plan,
    startDate,
    endDate: plan === 'lifetime' ? null : getPlanEndDate(plan, new Date(startDate)),
    purchaseToken: purchase.purchaseId ?? purchase.transactionId ?? purchase.id,
    productId: purchase.id,
    isExpired: Boolean(purchase.isExpired) && plan !== 'lifetime',
    restoredAt,
  });
}

export function pickBestVerifiedPurchase(purchases: CdvPurchase.VerifiedPurchase[]) {
  const priority: Record<ProPlanId, number> = { lifetime: 3, yearly: 2, monthly: 1 };
  return purchases
    .map((purchase) => ({ purchase, plan: getPlanIdFromProductId(purchase.id) }))
    .filter((entry): entry is { purchase: CdvPurchase.VerifiedPurchase; plan: ProPlanId } => Boolean(entry.plan))
    .sort((left, right) => {
      const planDiff = priority[right.plan] - priority[left.plan];
      if (planDiff !== 0) return planDiff;
      return (right.purchase.purchaseDate ?? 0) - (left.purchase.purchaseDate ?? 0);
    })[0]?.purchase ?? null;
}
