
import { useState, useMemo } from 'react';
import { Target, Landmark, Repeat, ExternalLink, ChevronRight, ArrowUpRight, ArrowDownRight, CheckCircle2, LayoutGrid, Globe, User, Users, PieChart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getGoals, getLoans, getSubscriptions, getLinks, getPersonalExpenses, getHomeSettings, type GoalItem, type LoanItem, type SubscriptionItem, type LinkItem } from '@/lib/storage';
import { MoneyDisplay } from '@/components/MoneyDisplay';
import { useCurrency } from '@/hooks/use-currency';
import { cn } from '@/lib/utils';

interface WidgetContainerProps {
  title: string;
  icon: any;
  color: string;
  onViewAll: () => void;
  children: React.ReactNode;
  emptyText?: string;
}

function WidgetContainer({ title, icon: Icon, color, onViewAll, children, emptyText = "No active items" }: WidgetContainerProps) {
  return (
    <div className="ios-card-modern p-4 space-y-3.5 relative overflow-hidden group">
      <div className="flex items-center justify-between">
        <h3 className="font-black text-[13px] tracking-tight flex items-center gap-2.5">
          <div className={cn(
            "w-8 h-8 rounded-xl flex items-center justify-center border",
            color.replace('bg-', 'bg-').replace(' ', '') + "/15",
            color.replace('bg-', 'border-').replace(' ', '') + "/10"
          )}>
            <Icon size={16} className={color.replace('bg-', 'text-')} />
          </div>
          <span className="text-foreground uppercase tracking-tighter">{title}</span>
        </h3>
        <button 
          onClick={onViewAll}
          className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] hover:text-primary transition-colors flex items-center gap-1 pr-1"
        >
          View All <ChevronRight size={10} strokeWidth={4} />
        </button>
      </div>
      {children ? children : (
        <div className="py-2 text-center">
          <p className="text-[10px] text-muted-foreground font-medium opacity-40 italic">{emptyText}</p>
        </div>
      )}
    </div>
  );
}

export function GoalsWidget({ onNavigate }: { onNavigate: (id: string) => void }) {
  const currency = useCurrency();
  const settings = useMemo(() => getHomeSettings(), []);
  const goals = useMemo(() => {
    const all = getGoals().filter(g => {
      const total = (g.transactions || []).reduce((sum, t) => sum + t.amount, 0);
      return total < g.targetAmount;
    });
    
    if (settings.selectedGoalIds && settings.selectedGoalIds.length > 0) {
      return all.filter(g => settings.selectedGoalIds.includes(g.id));
    }
    return all.slice(0, 1);
  }, [settings]);

  return (
    <WidgetContainer 
      title="Active Goals" 
      icon={Target} 
      color="bg-success" 
      onViewAll={() => onNavigate('goals')}
      emptyText="No saving goals set"
    >
      {goals.length > 0 ? (
        <div className="space-y-3">
          {goals.map(goal => {
            const current = (goal.transactions || []).reduce((sum, t) => sum + t.amount, 0);
            const progress = Math.min(100, (current / goal.targetAmount) * 100);
            return (
              <div key={goal.id} className="relative p-4 bg-gradient-to-br from-secondary/40 to-secondary/5 border border-border/10 rounded-[1.75rem] space-y-3 shadow-xl overflow-hidden group/goal active:scale-[0.98] transition-all">
                {/* Visual Depth Glow */}
                <div className="absolute -top-10 -right-10 w-20 h-20 bg-success/5 blur-[40px] rounded-full pointer-events-none group-hover/goal:bg-success/10 transition-colors" />
                
                <div className="flex justify-between items-end relative z-10">
                  <div className="min-w-0 pr-2">
                    <p className="text-[12px] font-black text-foreground uppercase tracking-tight truncate leading-none mb-1">{goal.name}</p>
                    <p className="text-[10px] text-muted-foreground/40 font-bold uppercase tracking-widest">Savings Progress</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-success tabular-nums tracking-tighter leading-none">{Math.round(progress)}%</p>
                  </div>
                </div>

                <div className="relative z-10 h-1.5 bg-secondary rounded-full overflow-hidden shadow-inner border border-border/5">
                  <div 
                    className="h-full bg-success transition-all duration-700 ease-out relative shadow-[0_0_10px_rgba(34,197,94,0.3)] rounded-full" 
                    style={{ width: `${progress}%` }} 
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  </div>
                </div>

                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-tight text-muted-foreground/60 relative z-10">
                   <div className="flex items-center gap-1">
                      <span className="text-[8px] opacity-40">Saved:</span>
                      <span className="text-foreground/80 tabular-nums">{currency.symbol}{current.toLocaleString(currency.locale)}</span>
                   </div>
                   <div className="flex items-center gap-1">
                      <span className="text-[8px] opacity-40">Goal:</span>
                      <span className="text-foreground tabular-nums">{currency.symbol}{goal.targetAmount.toLocaleString(currency.locale)}</span>
                   </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </WidgetContainer>
  );
}

export function LoansWidget({ onNavigate }: { onNavigate: (id: string) => void }) {
  const loans = useMemo(() => getLoans().filter(l => !l.closedAt).slice(0, 1), []);
  const currency = useCurrency();

  return (
    <WidgetContainer 
      title="Upcoming Loans" 
      icon={Landmark} 
      color="bg-warning" 
      onViewAll={() => onNavigate('loans')}
      emptyText="No pending loans"
    >
      {loans.length > 0 ? (
        <div className="space-y-2">
          {loans.map(loan => (
            <div key={loan.id} className="p-3 bg-secondary/10 rounded-2xl border border-border/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-xl flex items-center justify-center",
                  loan.direction === 'you-gave' ? "bg-success/15 text-success" : "bg-danger/15 text-danger"
                )}>
                  {loan.direction === 'you-gave' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-foreground truncate leading-tight">{loan.loanName}</p>
                  <p className="text-[9px] text-muted-foreground font-medium mt-0.5 whitespace-nowrap">Due: {new Date(loan.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}</p>
                </div>
              </div>
              <p className={cn("text-xs font-black", loan.direction === 'you-gave' ? "text-success" : "text-danger")}>
                {currency.symbol}{loan.outstandingPrincipal.toLocaleString(currency.locale)}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </WidgetContainer>
  );
}

export function SubscriptionsWidget({ onNavigate }: { onNavigate: (id: string) => void }) {
  const settings = useMemo(() => getHomeSettings(), []);
  const subs = useMemo(() => {
    const all = getSubscriptions().filter(s => !s.paused);
    if (settings.selectedSubscriptionIds && settings.selectedSubscriptionIds.length > 0) {
      return all.filter(s => settings.selectedSubscriptionIds.includes(s.id));
    }
    return all.slice(0, 1);
  }, [settings]);
  const currency = useCurrency();

  return (
    <WidgetContainer 
      title="Subscription Dues" 
      icon={Repeat} 
      color="bg-primary" 
      onViewAll={() => onNavigate('subscriptions')}
      emptyText="No active cycles"
    >
      {subs.length > 0 ? (
        <div className="space-y-2.5">
          {subs.map(sub => (
            <div key={sub.id} className="relative p-3.5 bg-gradient-to-br from-secondary/40 to-secondary/10 border border-border/10 rounded-[1.75rem] flex items-center justify-between group/sub active:scale-[0.98] transition-all shadow-xl overflow-hidden">
              {/* Inner Glow Detail */}
              <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 blur-2xl rounded-full -mr-8 -mt-8 pointer-events-none" />
              
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-background/80 flex items-center justify-center border border-border/10 shadow-inner group-hover/sub:scale-105 transition-transform">
                   {sub.logoUrl ? (
                      <img src={sub.logoUrl} className="w-6 h-6 object-contain" alt="" />
                   ) : <CheckCircle2 size={16} className="text-primary" />}
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-black text-foreground tracking-tight leading-none mb-1">{sub.appName}</p>
                  <p className="text-[8px] text-muted-foreground/40 font-black uppercase tracking-[0.2em]">{sub.cycle}</p>
                </div>
              </div>
              <div className="text-right relative z-10 pr-1">
                <p className="text-sm font-black text-foreground tabular-nums tracking-tighter">
                  {currency.symbol}{sub.amount.toLocaleString(currency.locale)}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </WidgetContainer>
  );
}

export function CategoryInsightsWidget({ onNavigate }: { onNavigate: (id: string) => void }) {
  const settings = useMemo(() => getHomeSettings(), []);
  const categories = useMemo(() => {
    const expenses = getPersonalExpenses().filter(e => !e.isMirror);
    const map: Record<string, number> = {};
    expenses.forEach(e => {
       map[e.category] = (map[e.category] || 0) + e.amount;
    });
    const all = Object.entries(map).sort((a,b) => b[1] - a[1]);
    
    if (settings.selectedCategoryNames && settings.selectedCategoryNames.length > 0) {
      return all.filter(([cat]) => settings.selectedCategoryNames.includes(cat));
    }
    return all.slice(0, 2);
  }, [settings]);

  return (
    <WidgetContainer 
      title="Category Insights" 
      icon={LayoutGrid} 
      color="bg-purple-500" 
      onViewAll={() => onNavigate('categories')}
      emptyText="No categories tracked yet"
    >
      {categories.length > 0 ? (
        <div className="space-y-3">
          {categories.map(([cat, amount]) => (
            <div key={cat} className="flex justify-between items-center text-[11px]">
              <span className="font-bold text-foreground opacity-80">{cat}</span>
              <MoneyDisplay amount={amount} size="xs" />
            </div>
          ))}
        </div>
      ) : null}
    </WidgetContainer>
  );
}

export function BudgetsWidget({ onNavigate }: { onNavigate: (id: string) => void }) {
  // Mock/Simple implementation for now or use actual budget data if available
  return (
    <WidgetContainer 
      title="My Budgets" 
      icon={Landmark} 
      color="bg-emerald-500" 
      onViewAll={() => onNavigate('budgets')}
      emptyText="No budgets set"
    >
      <div className="py-2">
         <p className="text-[10px] text-muted-foreground text-center">Track your spending limits <br/> in the Budgets tab</p>
      </div>
    </WidgetContainer>
  );
}

export function ConverterWidget({ onNavigate }: { onNavigate: (id: string) => void }) {
  return (
    <WidgetContainer 
      title="Converter" 
      icon={Globe} 
      color="bg-indigo-500" 
      onViewAll={() => onNavigate('converter')}
    >
      <div className="flex items-center justify-between p-3 bg-secondary/5 rounded-2xl border border-border/5">
         <span className="text-[10px] font-bold text-foreground">Quick Conversion</span>
         <ChevronRight size={14} className="text-muted-foreground" />
      </div>
    </WidgetContainer>
  );
}

export function RecentPersonalWidget({ onNavigate }: { onNavigate: (id: string) => void }) {
  const recent = useMemo(() => getPersonalExpenses().filter(e => !e.isMirror).slice(0, 3), []);
  return (
    <WidgetContainer 
      title="Recent Private" 
      icon={User} 
      color="bg-orange-500" 
      onViewAll={() => onNavigate('personal')}
      emptyText="No personal expenses"
    >
      {recent.length > 0 ? (
        <div className="space-y-2">
          {recent.map(e => (
            <div key={e.id} className="flex justify-between items-center bg-secondary/5 p-2 rounded-xl border border-border/5">
               <div className="min-w-0">
                  <p className="text-[10px] font-bold text-foreground truncate">{e.reason}</p>
                  <p className="text-[8px] text-muted-foreground">{new Date(e.date).toLocaleDateString()}</p>
               </div>
               <MoneyDisplay amount={e.amount} size="xs" />
            </div>
          ))}
        </div>
      ) : null}
    </WidgetContainer>
  );
}

export function RecentSharedWidget({ onNavigate }: { onNavigate: (id: string) => void }) {
  return (
    <WidgetContainer 
      title="Recent Shared" 
      icon={Users} 
      color="bg-pink-500" 
      onViewAll={() => onNavigate('shared')}
      emptyText="No shared activity"
    >
      <div className="py-2">
         <p className="text-[10px] text-muted-foreground text-center italic">Go to Shared tab to see activity</p>
      </div>
    </WidgetContainer>
  );
}

export function PinnedLinksWidget({ onNavigate }: { onNavigate: (id: string) => void }) {
  const settings = useMemo(() => getHomeSettings(), []);
  const links = useMemo(() => {
    const all = getLinks();
    if (settings.selectedLinkIds && settings.selectedLinkIds.length > 0) {
      return all.filter(l => settings.selectedLinkIds.includes(l.id));
    }
    return all.filter(l => l.pinned).slice(0, 4);
  }, [settings]);

  return (
    <WidgetContainer 
      title="Quick Access" 
      icon={ExternalLink} 
      color="bg-sky-400" 
      onViewAll={() => onNavigate('links')}
      emptyText="Pin important links"
    >
      {links.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {links.map(link => (
            <a 
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="relative p-2.5 bg-gradient-to-br from-secondary/50 to-secondary/10 rounded-[1.5rem] border border-border/10 flex items-center gap-3 active:scale-95 transition-all group/link overflow-hidden h-14 shadow-lg"
            >
              {/* Card Glow */}
              <div className="absolute -top-6 -right-6 w-12 h-12 bg-sky-400/10 blur-xl rounded-full pointer-events-none" />
              
              <div className="w-9 h-9 bg-background rounded-full flex items-center justify-center shrink-0 border border-border/10 group-hover/link:bg-primary/5 transition-colors shadow-inner relative z-10">
                {link.favicon ? (
                  <img src={link.favicon} alt="" className="w-5 h-5 object-contain" />
                ) : (
                  <ExternalLink size={12} className="text-muted-foreground/30" />
                )}
              </div>
              <div className="min-w-0 flex-1 relative z-10">
                <p className="text-[11px] font-black text-foreground/90 truncate pr-1 tracking-tight leading-none uppercase">{link.title || link.name || 'Untitled'}</p>
              </div>
              <div className="absolute right-3 opacity-0 group-hover/link:opacity-20 transition-opacity">
                <ArrowUpRight size={14} className="text-sky-400" />
              </div>
            </a>
          ))}
        </div>
      ) : null}
    </WidgetContainer>
  );
}
