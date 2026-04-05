import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BadgeCheck,
  LayoutGrid,
  Link as LinkIcon,
  MessageCircle,
  RefreshCw,
  Repeat,
  Shield,
  Sparkles,
  Star,
  Target,
  Users,
  WalletCards,
  Zap,
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useBilling } from '@/hooks/useBilling';
import { useProGate } from '@/hooks/useProGate';
import { isProUserCached } from '@/lib/proAccess';
import {
  type ProPlanId,
  getPlanDescription,
  getPlanLabel,
} from '@/lib/proSubscription';

const PRO_FEATURES = [
  { icon: Star, name: 'Ad-free Experience', desc: 'No more interruptions while managing your money.' },
  { icon: Users, name: 'Unlimited Shared Members', desc: 'Add more than 3 persons in individual shared history.' },
  { icon: LayoutGrid, name: 'Multiple Groups', desc: 'Create more than 1 sharing group in the Shared tab.' },
  { icon: LinkIcon, name: 'Unlimited Links', desc: 'Save and organize more than 4 useful links.' },
  { icon: Target, name: 'Financial Freedom', desc: 'Manage more than 1 personal goal and loan.' },
  { icon: WalletCards, name: 'Subscription Mastery', desc: 'Track more than 2 recurring subscriptions.' },
  { icon: Repeat, name: 'Massive Transaction History', desc: 'Add more than 5 transactions in both tabs.' },
  { icon: LayoutGrid, name: 'Grouped Links', desc: 'Organize your links into multiple categories.' },
  { icon: RefreshCw, name: 'Friend Collaboration', desc: 'Real-time cloud sync with friends and group members.' },
  { icon: Shield, name: 'Advanced Data Security', desc: 'Unlimited daily backups and automated cloud sync.' },
  { icon: MessageCircle, name: 'Priority Dev Support', desc: 'Get quick responses and direct support from the developer.' },
];

const PLAN_CONFIG: Record<ProPlanId, { title: string; cta: string; accent: string; tag: string; highlight: string; }> = {
  monthly: {
    title: 'Monthly',
    cta: 'Choose Monthly',
    accent: 'from-cyan-500 to-blue-600',
    tag: 'Flexible',
    highlight: 'Best for trying Pro first',
  },
  yearly: {
    title: 'Yearly',
    cta: 'Choose Yearly',
    accent: 'from-amber-500 to-orange-600',
    tag: 'Best Value',
    highlight: 'Lowest cost per month',
  },
  lifetime: {
    title: 'Lifetime',
    cta: 'Choose Lifetime',
    accent: 'from-fuchsia-500 to-violet-600',
    tag: 'One-time',
    highlight: 'Pay once, keep it forever',
  },
};

function PriceSkeleton() {
  return <div className="h-8 w-28 rounded-xl bg-white/10 animate-pulse" />;
}

export default function ProUpgradeScreen() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isPro, plan, loading: proLoading } = useProGate();
  const { products, purchaseMonthly, purchaseYearly, purchaseLifetime, restorePurchases, loading, error } = useBilling();
  const [busyPlanId, setBusyPlanId] = useState<ProPlanId | null>(null);
  const [restoring, setRestoring] = useState(false);
  const isNative = Capacitor.isNativePlatform();
  const isEffectivePro = isPro || isProUserCached();

  const priceByPlan = useMemo(() => Object.fromEntries(products.map((item) => [item.plan, item])) as Record<ProPlanId, typeof products[number]>, [products]);

  const handlePurchase = async (selectedPlanId: ProPlanId) => {
    setBusyPlanId(selectedPlanId);
    try {
      if (selectedPlanId === 'monthly') await purchaseMonthly();
      if (selectedPlanId === 'yearly') await purchaseYearly();
      if (selectedPlanId === 'lifetime') await purchaseLifetime();

      toast({
        title: 'Purchase started',
        description: `${PLAN_CONFIG[selectedPlanId].title} Pro is processing.`,
      });
    } catch (purchaseError) {
      toast({
        title: 'Purchase failed',
        description: (purchaseError as Error).message || 'Could not start purchase flow.',
        variant: 'destructive',
      });
    } finally {
      setBusyPlanId(null);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const restored = await restorePurchases();
      toast({
        title: restored ? 'Pro restored!' : 'No active subscription found',
        description: restored ? 'Your purchase was revalidated and synced.' : 'Google Play did not return an active subscription.',
      });
    } catch (restoreError) {
      toast({
        title: 'Restore failed',
        description: (restoreError as Error).message || 'Could not restore purchases.',
        variant: 'destructive',
      });
    } finally {
      setRestoring(false);
    }
  };

  const renderPrice = (planId: ProPlanId) => {
    const item = priceByPlan[planId];
    if (!item || item.loading || !item.localizedPrice) {
      return <PriceSkeleton />;
    }

    return <p className="text-3xl font-black italic tracking-tighter text-foreground leading-none">{item.localizedPrice}</p>;
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-foreground pb-24 selection:bg-primary/20">
      <div className="relative min-h-[380px] pt-14 px-6 pb-12 overflow-hidden bg-[#0A0A0B] flex flex-col justify-end">
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0B] via-transparent to-transparent z-10" />
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/20 blur-[110px] -mr-40 -mt-40 animate-pulse" />
        <div className="absolute top-16 left-8 w-40 h-40 bg-cyan-500/10 blur-[80px] animate-pulse delay-700" />
        <div className="absolute bottom-16 right-16 w-24 h-24 rounded-full bg-white/5 blur-2xl" />

        <div className="relative z-30 mb-auto">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-foreground active:scale-90 transition-all focus:outline-none backdrop-blur-md"
          >
            <ArrowLeft size={20} strokeWidth={2.5} />
          </button>
        </div>

        <div className="relative z-20 mt-12 space-y-4 max-w-[320px]">
          <h1 className="text-5xl font-black italic tracking-tighter uppercase leading-[0.9] animate-in slide-in-from-bottom-8 duration-700 delay-100">
            Pro <span className="text-primary tracking-[-0.05em] block">Access.</span>
          </h1>
          <p className="text-xs text-muted-foreground/60 font-medium uppercase tracking-widest leading-loose max-w-[280px] animate-in slide-in-from-bottom-10 duration-1000 delay-200">
            Unlock the full potential of your financial journey with SplitMate Pro.
          </p>

          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/80 backdrop-blur-md animate-in fade-in duration-1000 delay-300">
            <Sparkles size={12} className="text-primary" />
            {isPro ? `Pro active${plan ? ` · ${getPlanLabel(plan)}` : ''}` : 'Unlock everything'}
          </div>

          <div className="flex flex-wrap gap-2 pt-1 animate-in fade-in duration-1000 delay-300">
            {['Google Play Billing', 'Firestore sync', 'Restore anytime'].map((item) => (
              <span key={item} className="px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-[9px] font-black uppercase tracking-[0.22em] text-white/55 backdrop-blur-md">
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="px-5 -mt-4 relative z-20 space-y-10">
        {!isEffectivePro && (
          <div className="grid grid-cols-1 gap-4">
            {(Object.keys(PLAN_CONFIG) as ProPlanId[]).map((planId) => (
              <div
                key={planId}
                className={cn(
                  'group relative p-6 rounded-[2.5rem] bg-[#161618] border overflow-hidden active:scale-95 transition-all duration-300 shadow-2xl',
                  plan === planId ? 'border-primary/50 shadow-primary/20 ring-1 ring-primary/20' : 'border-white/5',
                )}
              >
                <div className={cn('absolute inset-x-0 top-0 h-1 bg-gradient-to-r opacity-70', PLAN_CONFIG[planId].accent)} />
                <div className="absolute top-0 right-0 p-4">
                  <div className={cn('px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest italic bg-white/5 border border-white/5', planId === 'yearly' ? 'text-amber-400' : 'text-white/40')}>
                    {PLAN_CONFIG[planId].tag}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2">
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-40 mb-1">{PLAN_CONFIG[planId].title} Access</h3>
                    {renderPrice(planId)}
                    <p className="mt-2 text-[9px] font-black uppercase tracking-[0.22em] text-primary/70">{PLAN_CONFIG[planId].highlight}</p>
                  </div>
                  <div className={cn('w-12 h-12 rounded-[1.5rem] flex items-center justify-center bg-gradient-to-br shadow-xl shadow-primary/10', PLAN_CONFIG[planId].accent)}>
                    <Zap size={20} className="text-white" fill="white" strokeWidth={0} />
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-1.5 overflow-hidden whitespace-nowrap">
                  {['Cloud Sync', 'Unlimited Records', 'Priority Support'].map((benefit) => (
                    <span key={benefit} className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/30 border border-white/5 rounded-full px-2.5 py-1">
                      {benefit}
                    </span>
                  ))}
                </div>

                <p className="mt-4 text-[10px] font-medium text-muted-foreground/50 uppercase tracking-[0.2em] leading-relaxed">
                  {getPlanDescription(planId)}
                </p>

                <Button
                  type="button"
                  variant={plan === planId ? 'secondary' : 'premium'}
                  className={cn('mt-5 w-full h-14 rounded-[1.5rem] text-[11px] uppercase tracking-[0.2em] font-black', plan === planId && 'bg-white/10 text-white')}
                  disabled={loading || proLoading || busyPlanId !== null || !isNative}
                  onClick={() => void handlePurchase(planId)}
                >
                  {busyPlanId === planId ? 'Processing...' : plan === planId ? 'Current Plan' : PLAN_CONFIG[planId].cta}
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-6">
          <div className="flex items-center gap-4 px-2">
            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-primary italic">Inside The Pro Pass</h2>
            <div className="h-[1px] flex-1 bg-gradient-to-r from-primary/30 to-transparent" />
          </div>

          <div className="grid grid-cols-1 gap-3">
            {PRO_FEATURES.map((feature) => (
              <div key={feature.name} className="flex gap-4 p-4 rounded-[1.75rem] bg-[#161618]/60 border border-white/5 active:scale-[0.98] transition-all">
                <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center shrink-0 border border-primary/10">
                  <feature.icon size={18} className="text-primary" strokeWidth={2.5} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-black uppercase tracking-tight italic text-foreground leading-none">{feature.name}</h4>
                  <p className="text-[10px] font-medium text-muted-foreground/60 leading-relaxed uppercase tracking-wide">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 rounded-[2rem] bg-[#161618]/70 border border-white/5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/10">
              <BadgeCheck size={18} className="text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-tight italic">Your current status</h3>
              <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest">
                {isPro ? `Pro active${plan ? ` · ${getPlanLabel(plan)}` : ''}` : 'No active Pro plan yet'}
              </p>
            </div>
          </div>

          {error && (
            <p className="text-[10px] font-bold text-destructive uppercase tracking-[0.18em] leading-relaxed">
              {error}
            </p>
          )}

          {!isEffectivePro && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Button type="button" variant="secondary" className="h-14 rounded-[1.5rem] uppercase tracking-[0.2em] font-black" onClick={() => void handleRestore()} disabled={restoring || loading || proLoading}>
                {restoring ? 'Restoring...' : 'Restore Purchases'}
              </Button>
              <Button type="button" variant="outline" className="h-14 rounded-[1.5rem] uppercase tracking-[0.2em] font-black border-white/10 bg-white/5 text-white" onClick={() => void handleRestore()} disabled={restoring || loading || proLoading || !isNative}>
                Refresh Store
              </Button>
            </div>
          )}
        </div>

        <div className="text-center pt-4 pb-8 space-y-4">
          <div className="w-16 h-1 rounded-full bg-muted/20 mx-auto" />
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 px-10 italic leading-loose">
            Prices are fetched live from Google Play. Subscription state is synced to your Firebase account.
          </p>

          {!isEffectivePro && (
            <Button
              type="button"
              variant="premium"
              className="w-full h-16 rounded-[2rem] text-white font-black uppercase italic tracking-[0.2em] shadow-[0_15px_30px_-10px_rgba(var(--primary),0.4)] active:scale-95 transition-all outline-none"
              disabled={loading || proLoading || busyPlanId !== null || !isNative}
              onClick={() => void handleRestore()}
            >
              {isNative ? 'Restore Purchase' : 'Open on Android to Purchase'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
