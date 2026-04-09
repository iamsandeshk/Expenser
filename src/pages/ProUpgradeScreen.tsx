import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
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
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useBilling } from '@/hooks/useBilling';
import { useProGate } from '@/hooks/useProGate';
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
  { icon: Repeat, name: 'Massive Transaction History', desc: 'Add more than 8 transactions per day in both tabs.' },
  { icon: LayoutGrid, name: 'Grouped Links', desc: 'Organize your links into multiple categories.' },
  { icon: RefreshCw, name: 'Friend Collaboration', desc: 'Real-time cloud sync with friends and group members.' },
  { icon: Shield, name: 'Advanced Data Security', desc: 'Unlimited daily backups and automated cloud sync.' },
  { icon: MessageCircle, name: 'Priority Dev Support', desc: 'Get quick responses and direct support from the developer.' },
];

const PLAN_CONFIG: Record<ProPlanId, { title: string; cta: string; accent: string; tag: string; highlight: string; cadence: string; }> = {
  monthly: {
    title: 'Monthly',
    cta: 'Get Pro',
    accent: 'from-cyan-500 to-blue-600',
    tag: 'Flexible',
    highlight: 'Best for trying Pro first',
    cadence: 'Per month',
  },
  yearly: {
    title: 'Yearly',
    cta: 'Get Pro',
    accent: 'from-amber-500 to-orange-600',
    tag: 'Best Value',
    highlight: 'Lowest cost per month',
    cadence: 'Per year',
  },
  lifetime: {
    title: 'Lifetime',
    cta: 'Get Pro',
    accent: 'from-fuchsia-500 to-violet-600',
    tag: 'One-time',
    highlight: 'Pay once, keep it forever',
    cadence: 'Lifetime',
  },
};

function PriceSkeleton() {
  return <div className="h-8 w-28 rounded-xl bg-muted/40 animate-pulse" />;
}

export default function ProUpgradeScreen() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isPro, plan, loading: proLoading } = useProGate();
  const { products, purchaseMonthly, purchaseYearly, purchaseLifetime, restorePurchases, loading, error } = useBilling();
  const [busyPlanId, setBusyPlanId] = useState<ProPlanId | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [refreshSpinning, setRefreshSpinning] = useState(false);
  const isNative = Capacitor.isNativePlatform();
  const isEffectivePro = isPro;

  const priceByPlan = useMemo(() => Object.fromEntries(products.map((item) => [item.plan, item])) as Record<ProPlanId, typeof products[number]>, [products]);

  const handlePurchase = async (selectedPlanId: ProPlanId) => {
    setBusyPlanId(selectedPlanId);
    try {
      if (selectedPlanId === 'monthly') await purchaseMonthly();
      if (selectedPlanId === 'yearly') await purchaseYearly();
      if (selectedPlanId === 'lifetime') await purchaseLifetime();
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

  const handleRefreshStore = async () => {
    setRefreshSpinning(true);
    window.setTimeout(() => setRefreshSpinning(false), 700);
    await handleRestore();
  };

  const renderPrice = (planId: ProPlanId) => {
    const item = priceByPlan[planId];
    if (!item || item.loading || !item.localizedPrice) {
      return <PriceSkeleton />;
    }

    return <p className="text-2xl sm:text-3xl font-black italic tracking-tighter text-foreground leading-none">{item.localizedPrice}</p>;
  };

  const handleContactDev = () => {
    const mailto = 'mailto:try.sandeshk@gmail.com?subject=Premium%20Support';
    if (Capacitor.isNativePlatform()) {
      window.location.href = mailto;
      return;
    }
    window.open(mailto, '_blank');
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 selection:bg-primary/20">
      <div className="relative min-h-[380px] pt-14 px-6 pb-12 overflow-hidden flex flex-col justify-end bg-gradient-to-b from-background via-background to-muted/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.14),transparent_32%),radial-gradient(circle_at_left_20%_bottom_20%,hsl(var(--primary)/0.08),transparent_30%)] z-0" />
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/15 blur-[110px] -mr-40 -mt-40 animate-pulse" />
        <div className="absolute top-16 left-8 w-40 h-40 bg-cyan-500/10 blur-[80px] animate-pulse delay-700" />
        <div className="absolute bottom-16 right-16 w-24 h-24 rounded-full bg-foreground/5 blur-2xl" />

        <div className="relative z-30 mb-auto">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-2xl bg-card/80 border border-border flex items-center justify-center text-foreground active:scale-90 transition-all focus:outline-none backdrop-blur-md shadow-sm"
          >
            <ArrowLeft size={20} strokeWidth={2.5} />
          </button>
        </div>

        <div className="relative z-20 mt-12 space-y-4 max-w-[320px]">
          <h1 className="text-5xl font-black italic tracking-tighter uppercase leading-[0.9] animate-in slide-in-from-bottom-8 duration-700 delay-100 text-foreground">
            Pro <span className="text-primary tracking-[-0.05em] block">Access.</span>
          </h1>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest leading-loose max-w-[280px] animate-in slide-in-from-bottom-10 duration-1000 delay-200">
            Unlock the full potential of your financial journey with SplitMate Pro.
          </p>

          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-card/80 border border-border text-[10px] font-black uppercase tracking-widest text-foreground/80 backdrop-blur-md animate-in fade-in duration-1000 delay-300 shadow-sm">
            <Sparkles size={12} className="text-primary" />
            {isPro ? `Pro active${plan ? ` · ${getPlanLabel(plan)}` : ''}` : 'Unlock everything'}
          </div>
        </div>
      </div>

      <div className="px-5 -mt-4 relative z-20 space-y-10">
        {!isEffectivePro && (
          <div className="grid grid-cols-1 gap-3">
            {(Object.keys(PLAN_CONFIG) as ProPlanId[]).map((planId) => (
              <div
                key={planId}
                className={cn(
                    'group relative p-4 sm:p-5 rounded-[2rem] bg-card border overflow-hidden active:scale-95 transition-all duration-300 shadow-lg',
                  plan === planId ? 'border-primary/40 shadow-primary/10 ring-1 ring-primary/20' : 'border-border/70',
                )}
              >
                <div className={cn('absolute inset-x-0 top-0 h-1 bg-gradient-to-r opacity-70', PLAN_CONFIG[planId].accent)} />
                  <div className="absolute top-0 right-0 p-3">
                    <div className={cn('px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest italic bg-muted/50 border border-border', planId === 'yearly' ? 'text-amber-500' : 'text-muted-foreground')}>
                    {PLAN_CONFIG[planId].tag}
                  </div>
                </div>

                  <div className="flex items-start justify-between gap-4 pr-0 sm:pr-1 mt-1">
                    <div className="min-w-0 flex-1 space-y-1.5 pt-2">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground/80">{PLAN_CONFIG[planId].title} Access</h3>
                      <div className="flex flex-col items-start gap-1">
                        {renderPrice(planId)}
                        <p className="text-[9px] font-black uppercase tracking-[0.24em] text-primary/80">{PLAN_CONFIG[planId].cadence}</p>
                  </div>
                    </div>
                    <div className="shrink-0 flex items-start pt-7 sm:pt-5">
                      <Button
                        type="button"
                        variant={plan === planId ? 'secondary' : 'premium'}
                        className={cn('h-11 px-4 rounded-full text-[10px] uppercase tracking-[0.22em] font-black min-w-[96px] shadow-md', plan === planId && 'bg-white/10 text-white')}
                        disabled={loading || proLoading || busyPlanId !== null || !isNative}
                        onClick={() => void handlePurchase(planId)}
                      >
                        {busyPlanId === planId ? '...' : 'Get Pro'}
                      </Button>
                  </div>
                </div>

                  <p className="mt-3 text-[10px] font-medium text-muted-foreground/70 uppercase tracking-[0.2em] leading-relaxed max-w-[18rem]">
                  {getPlanDescription(planId)}
                </p>
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
              <div key={feature.name} className="flex gap-4 p-4 rounded-[1.75rem] bg-card/80 border border-border active:scale-[0.98] transition-all shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/10">
                  <feature.icon size={18} className="text-primary" strokeWidth={2.5} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-black uppercase tracking-tight italic text-foreground leading-none">{feature.name}</h4>
                  <p className="text-[10px] font-medium text-muted-foreground/70 leading-relaxed uppercase tracking-wide">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 rounded-[2rem] bg-card/80 border border-border space-y-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/10">
              <img
                src="/assets/pro-verified-gold.png"
                alt="Pro verified"
                className="w-6 h-6 object-contain"
              />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-tight italic">Your current status</h3>
              <p className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-widest">
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
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 items-center">
              <Button
                type="button"
                variant="secondary"
                className="h-14 rounded-[1.5rem] uppercase tracking-[0.2em] font-black"
                onClick={() => void handleRestore()}
                disabled={restoring || loading || proLoading}
              >
                {restoring ? 'Restoring...' : 'Restore'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-14 w-14 rounded-[1.5rem] border-border bg-card/80 text-foreground shadow-sm"
                onClick={() => void handleRefreshStore()}
                disabled={restoring || loading || proLoading || !isNative}
                aria-label="Refresh store"
              >
                <RefreshCw size={18} className={refreshSpinning || restoring ? 'animate-spin' : ''} />
              </Button>
            </div>
          )}
        </div>

        {isEffectivePro && (
          <div className="pb-2 flex justify-center">
            <button
              type="button"
              onClick={handleContactDev}
              className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary/90 hover:text-primary active:scale-95 transition-all"
            >
              Contact Dev
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
