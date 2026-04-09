
import { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Repeat, 
  Calendar, 
  Trash2, 
  ExternalLink, 
  Search, 
  Plus, 
  LayoutGrid, 
  ChevronRight, 
  ChevronLeft,
  ArrowLeft, 
  AlertCircle,
  Clock,
  Settings2,
  Filter,
  ArrowUpRight,
  Pause,
  Play,
  X as CloseIcon,
  Lock
} from 'lucide-react';
import { MoneyDisplay } from '@/components/MoneyDisplay';
import { generateId, getSubscriptions, saveSubscriptions, type SubscriptionCycle, type SubscriptionItem, getCurrency, FREE_LIMITS } from '@/lib/storage';
import { cn } from '@/lib/utils';
import { AccountQuickButton } from '@/components/AccountQuickButton';
import { useBackHandler } from '@/hooks/useBackHandler';
import { NativeAdCard } from '@/components/NativeAdCard';
import { useBannerAd } from '@/hooks/useBannerAd';
import { useProGate } from '@/hooks/useProGate';
import { requestProUpgrade } from '@/lib/proAccess';

interface SubscriptionsTabProps {
  onOpenAccount: () => void;
  onBack?: () => void;
  bannerAdActive?: boolean;
}

const APP_SUGGESTIONS: Array<{ name: string; domain: string }> = [
  { name: 'Netflix', domain: 'netflix.com' },
  { name: 'Spotify', domain: 'spotify.com' },
  { name: 'YouTube', domain: 'youtube.com' },
  { name: 'YouTube Premium', domain: 'youtube.com' },
  { name: 'Amazon Prime', domain: 'primevideo.com' },
  { name: 'Disney+', domain: 'disneyplus.com' },
  { name: 'Apple Music', domain: 'music.apple.com' },
  { name: 'iCloud', domain: 'icloud.com' },
  { name: 'Google One', domain: 'one.google.com' },
  { name: 'Canva', domain: 'canva.com' },
  { name: 'Notion', domain: 'notion.so' },
  { name: 'ChatGPT Plus', domain: 'openai.com' },
  { name: 'X Premium', domain: 'x.com' },
  { name: 'Instagram', domain: 'instagram.com' },
  { name: 'LinkedIn Premium', domain: 'linkedin.com' },
  { name: 'Dropbox', domain: 'dropbox.com' },
  { name: 'Google Workspace', domain: 'workspace.google.com' },
  { name: 'Microsoft 365', domain: 'microsoft.com' },
  { name: 'Adobe Creative Cloud', domain: 'adobe.com' },
  { name: 'Figma', domain: 'figma.com' },
  { name: 'JioSaavn', domain: 'jiosaavn.com' },
  { name: 'Hotstar', domain: 'hotstar.com' },
  { name: 'Sony LIV', domain: 'sonyliv.com' },
  { name: 'ZEE5', domain: 'zee5.com' },
];

const CYCLES: SubscriptionCycle[] = ['daily', 'weekly', 'monthly', 'yearly', 'lifetime'];

function getLogoUrl(name: string): string | undefined {
  const toFavicon = (domain: string) => `https://www.google.com/s2/favicons?sz=128&domain=${domain}`;
  const lower = name.toLowerCase();
  const direct = APP_SUGGESTIONS.find((item) => item.name.toLowerCase() === lower);
  if (direct) return toFavicon(direct.domain);
  const partial = APP_SUGGESTIONS.find((item) => lower.includes(item.name.toLowerCase()) || item.name.toLowerCase().includes(lower));
  if (partial) return toFavicon(partial.domain);
  return undefined;
}

function getDaysUntilDue(startDate: string, cycle: SubscriptionCycle, createdAt: string): number | null {
  if (cycle === 'lifetime') return null;
  const start = new Date(startDate);
  
  if (startDate.length <= 10) {
    const timeRef = new Date(createdAt);
    start.setHours(timeRef.getHours(), timeRef.getMinutes(), 0, 0);
  }
  
  const now = new Date();
  
  if (start > now) {
     const diff = start.getTime() - now.getTime();
     return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  const nextDue = new Date(start);
  while (nextDue <= now) {
    if (cycle === 'daily') nextDue.setDate(nextDue.getDate() + 1);
    else if (cycle === 'weekly') nextDue.setDate(nextDue.getDate() + 7);
    else if (cycle === 'monthly') nextDue.setMonth(nextDue.getMonth() + 1);
    else if (cycle === 'yearly') nextDue.setFullYear(nextDue.getFullYear() + 1);
    else break;
  }
  
  const diff = nextDue.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

import { motion, AnimatePresence } from 'framer-motion';

export function SubscriptionsTab({ onOpenAccount, onBack, bannerAdActive = true }: SubscriptionsTabProps) {
  useBannerAd(bannerAdActive);
  const { isPro } = useProGate();
  const [items, setItems] = useState<SubscriptionItem[]>(getSubscriptions());
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState<'All' | 'Monthly' | 'Yearly' | 'Weekly' | 'Paused'>('All');
  const [logoLoadErrorMap, setLogoLoadErrorMap] = useState<Record<string, boolean>>({});
  const [suggestionLogoErrorMap, setSuggestionLogoErrorMap] = useState<Record<string, boolean>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<SubscriptionItem | null>(null);
  const currency = getCurrency();

  useBackHandler(showAdd, () => setShowAdd(false));
  useBackHandler(!!selectedItem, () => setSelectedItem(null));
  useBackHandler(!!deletingId, () => setDeletingId(null));
  
  useEffect(() => {
    const handleTriggerAdd = (e: any) => {
      if (e.detail?.tabId === 'subscriptions') setShowAdd(true);
    };
    window.addEventListener('splitmate_trigger_add', handleTriggerAdd);
    return () => window.removeEventListener('splitmate_trigger_add', handleTriggerAdd);
  }, []);

  const [form, setForm] = useState({
    appName: '',
    amount: '',
    cycle: 'monthly' as SubscriptionCycle,
    logoUrl: '',
    startDate: new Date().toISOString().split('T')[0],
  });

  const stats = useMemo(() => {
    let monthly = 0;
    let yearly = 0;
    const activeItems = items.filter(i => !i.paused);
    activeItems.forEach(item => {
      let mAmount = 0;
      if (item.cycle === 'monthly') mAmount = item.amount;
      else if (item.cycle === 'yearly') mAmount = item.amount / 12;
      else if (item.cycle === 'weekly') mAmount = (item.amount * 52) / 12;
      else if (item.cycle === 'daily') mAmount = item.amount * 30.4;
      
      monthly += mAmount;
      yearly += mAmount * 12;
    });
    return { monthly, yearly, active: activeItems.length };
  }, [items]);

  const upcomingItem = useMemo(() => {
    if (items.length === 0) return null;
    const itemsWithDays = items
      .filter(item => item.cycle !== 'lifetime' && !item.paused)
      .map(item => ({ 
        ...item, 
        days: getDaysUntilDue(item.startDate || item.createdAt, item.cycle, item.createdAt)
      }))
      .filter(item => item.days !== null)
      .sort((a, b) => (a.days as number) - (b.days as number));
    
    return itemsWithDays[0] || null;
  }, [items]);

  const filteredItems = useMemo(() => {
    if (filter === 'All') return items;
    return items.filter(item => item.cycle.toLowerCase() === filter.toLowerCase());
  }, [items, filter]);

  const handleCreate = () => {
    const amount = Number(form.amount);
    if (!form.appName.trim() || !Number.isFinite(amount) || amount <= 0) return;

    const item: SubscriptionItem = {
      id: generateId(),
      appName: form.appName.trim(),
      amount,
      cycle: form.cycle,
      logoUrl: form.logoUrl || getLogoUrl(form.appName),
      startDate: form.startDate,
      createdAt: new Date().toISOString(),
    };

    const next = [item, ...items];
    const saved = saveSubscriptions(next);
    if (!saved) return;
    setItems(next);
    setForm({ appName: '', amount: '', cycle: 'monthly', logoUrl: '', startDate: new Date().toISOString().split('T')[0] });
    setShowAdd(false);
  };

  const handleDeleteTrigger = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setDeletingId(id);
  };

  const togglePause = (id: string) => {
    const next = items.map(item => 
      item.id === id ? { ...item, paused: !item.paused } : item
    );
    const saved = saveSubscriptions(next);
    if (!saved) return;
    setItems(next);
    setSelectedItem(null);
  };

  const confirmDelete = () => {
    if (!deletingId) return;
    const pExpenses = JSON.parse(localStorage.getItem('splitmate_personal_expenses') || '[]');
    const nextPExpenses = pExpenses.filter((pe: any) => pe.mirrorFromId !== deletingId);
    localStorage.setItem('splitmate_personal_expenses', JSON.stringify(nextPExpenses));

    const next = items.filter((item) => item.id !== deletingId);
    const saved = saveSubscriptions(next);
    if (!saved) return;
    setItems(next);
    setDeletingId(null);
  };

  return (
    <div className="min-h-screen bg-transparent text-foreground pb-24 relative">
      <div className="px-4 pt-14 pb-6 space-y-6">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="w-11 h-11 rounded-2xl bg-secondary/80 border border-border/10 flex items-center justify-center active:scale-90 transition-all shadow-sm"
              aria-label="Back"
            >
              <ChevronLeft size={20} strokeWidth={2.5} />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Subscriptions</h1>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mt-0.5">
              {stats.active} active · {upcomingItem ? `next due in ${upcomingItem.days} days` : 'No upcoming renewals'}
            </p>
          </div>
        </div>

        <div className="ios-card-modern overflow-hidden border-border/20 shadow-2xl shadow-primary/5 flex divide-x divide-border/60 bg-secondary/5 rounded-[2rem]">
          <div className="flex-1 p-5 text-center flex flex-col justify-center gap-1 hover:bg-secondary/10 transition-colors">
            <p className="text-xl font-bold tracking-tight text-destructive flex items-center justify-center">
              <MoneyDisplay amount={-stats.monthly} size="sm" />
            </p>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Monthly</p>
          </div>
          <div className="flex-1 p-5 text-center flex flex-col justify-center gap-1 hover:bg-secondary/10 transition-colors">
            <p className="text-xl font-bold tracking-tight text-destructive flex items-center justify-center">
              <MoneyDisplay amount={-stats.yearly} size="sm" />
            </p>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Yearly</p>
          </div>
          <div className="flex-1 p-5 text-center flex flex-col justify-center gap-1 hover:bg-secondary/10 transition-colors">
            <p className="text-2xl font-bold tracking-tight text-primary leading-tight">{stats.active}</p>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Active</p>
          </div>
        </div>

        {upcomingItem && (
          <div className="bg-[#FFF4E5] dark:bg-[#2A1D0B] p-4 rounded-[1.5rem] flex items-center gap-3 border border-warning/20 transition-transform active:scale-[0.99]" style={{ color: 'hsl(35, 100%, 35%)' }}>
             <Clock size={18} className="text-warning flex-shrink-0" />
             <p className="text-xs font-semibold truncate">
               {upcomingItem.appName} renews in {upcomingItem.days} days · <span className="text-destructive">-{currency.symbol}{upcomingItem.amount}</span>
             </p>
          </div>
        )}

        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-2 -mx-4 px-4">
           {['All', 'Monthly', 'Yearly', 'Weekly', 'Paused'].map((item) => (
             <button
                key={item}
                onClick={() => setFilter(item as any)}
                className={cn(
                  "px-5 py-2.5 rounded-full text-[13px] font-bold transition-all duration-300 whitespace-nowrap",
                  filter === item 
                    ? "bg-[#6366F1] text-white shadow-lg shadow-indigo-500/40 scale-[1.05]" 
                    : "bg-secondary/40 text-muted-foreground border border-border/10 hover:bg-secondary/60"
                )}
             >
               {item}
             </button>
           ))}
        </div>
      </div>

      <div className="px-4 space-y-6">
        <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] pl-1">Active</h3>

        <div className="flex flex-col gap-5">
          {filteredItems.map((item, index) => {
            const isLockedSubscription = !isPro && index >= FREE_LIMITS.MAX_SUBSCRIPTIONS;
            const failed = logoLoadErrorMap[item.id] || !item.logoUrl;
            const daysUntil = getDaysUntilDue(item.startDate || item.createdAt, item.cycle, item.createdAt);
            
            return (
              <div key={item.id} className="contents">
                 <div 
                   onClick={() => {
                     if (isLockedSubscription) {
                       requestProUpgrade('subscriptions', 'Free users can track up to 2 subscriptions. Upgrade to Pro for unlimited subscriptions.');
                       return;
                     }
                     setSelectedItem(item);
                   }}
                   className={cn(
                     "ios-card-modern p-4 flex items-center gap-4 bg-secondary/10 border-border/5 hover:bg-secondary/20 transition-all active:scale-[0.98] cursor-pointer relative",
                     isLockedSubscription && "opacity-40"
                   )}
                 >
                   {isLockedSubscription && (
                     <>
                       <div className="absolute top-2 right-2 z-30 w-7 h-7 rounded-lg bg-black/55 border border-white/20 flex items-center justify-center">
                         <Lock size={12} className="text-white" />
                       </div>
                       <button
                         type="button"
                         onClick={(e) => {
                           e.stopPropagation();
                           requestProUpgrade('subscriptions', 'Free users can track up to 2 subscriptions. Upgrade to Pro for unlimited subscriptions.');
                         }}
                         className="absolute inset-0 z-40 pointer-events-auto"
                         aria-label="Upgrade to unlock this subscription"
                       />
                     </>
                   )}
                   <div 
                    className="w-14 h-14 rounded-[22.5%] overflow-hidden flex items-center justify-center bg-black/40 border border-border/10 flex-shrink-0 shadow-inner"
                    style={{ clipPath: 'inset(0% round 22.5%)' }}
                   >
                      {failed ? (
                        <span className="text-xl font-bold text-primary">{item.appName.charAt(0)}</span>
                      ) : (
                        <img 
                          src={item.logoUrl} 
                          alt="" 
                          className="w-full h-full object-cover"
                          onError={() => setLogoLoadErrorMap(prev => ({ ...prev, [item.id]: true }))}
                        />
                      )}
                   </div>
                   
                    <div className={cn("flex-1 min-w-0 transition-opacity", item.paused && "opacity-50")}>
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <h4 className="font-bold text-[15px] truncate flex items-center gap-2">
                          {item.appName}
                          {item.paused && (
                            <span className="px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-500 text-[8px] font-black uppercase tracking-tighter border border-blue-500/10">
                              PAUSED
                            </span>
                          )}
                        </h4>
                        <p className="text-[15px] font-black text-destructive flex-shrink-0">
                          -{currency.symbol}{item.amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </p>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 overflow-hidden">
                           <span className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-tight capitalize flex-shrink-0">{item.cycle}</span>
                           {item.startDate && (
                             <span className="text-[10px] text-muted-foreground/40 font-medium truncate">
                                · since {new Date(item.startDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                             </span>
                           )}
                        </div>
                        
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {!item.paused && daysUntil !== null && (
                            <div className="px-2 py-0.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-500 text-[9px] font-black uppercase tracking-wider">
                              due in {daysUntil}d
                            </div>
                          )}
                          {!item.paused && daysUntil === null && item.cycle === 'lifetime' && (
                            <div className="px-2 py-0.5 rounded-full bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-500 text-[9px] font-black uppercase tracking-wider">
                              Lifetime
                            </div>
                          )}
                          <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                            /{item.cycle.slice(0, 3)}
                          </span>
                        </div>
                      </div>
                   </div>
                 </div>
                 {(filteredItems.indexOf(item) === 0) && <NativeAdCard />}
              </div>
            );
          })}
        </div>
      </div>

      {showAdd && createPortal(
        <div className="fixed inset-0 z-[10001] flex items-end justify-center bg-black/70 backdrop-blur-xl p-4 animate-in fade-in duration-300" onClick={() => setShowAdd(false)}>
           <div 
             className="w-full max-w-md bg-card rounded-[2.5rem] p-7 pb-10 space-y-7 animate-in slide-in-from-bottom-10 duration-500"
             onClick={e => e.stopPropagation()}
           >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black tracking-tight">New Subscription</h2>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">Stay on top of your renewals</p>
                </div>
                <button onClick={() => setShowAdd(false)} className="w-11 h-11 rounded-full bg-secondary/50 flex items-center justify-center hover:bg-secondary transition-colors">
                  <CloseIcon size={20} />
                </button>
              </div>

              <div className="space-y-5">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Service Name</label>
                    <input 
                      autoFocus
                      value={form.appName}
                      onChange={e => setForm(prev => ({ ...prev, appName: e.target.value }))}
                      placeholder="e.g. Apple Music, Figma"
                      className="w-full h-14 rounded-2xl bg-secondary/30 border border-border/10 px-5 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Start Date</label>
                    <input 
                      type="date"
                      value={form.startDate}
                      onChange={e => setForm(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full h-14 rounded-2xl bg-secondary/30 border border-border/10 px-5 text-sm font-semibold outline-none"
                    />
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Price</label>
                       <input 
                         type="number"
                         value={form.amount}
                         onChange={e => setForm(prev => ({ ...prev, amount: e.target.value }))}
                         placeholder="0.00"
                         className="w-full h-14 rounded-2xl bg-secondary/30 border border-border/10 px-5 text-sm font-bold outline-none"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Cycle</label>
                       <select 
                         value={form.cycle}
                         onChange={e => setForm(prev => ({ ...prev, cycle: e.target.value as any }))}
                         className="w-full h-14 rounded-2xl bg-secondary/30 border border-border/10 px-5 text-sm font-bold outline-none appearance-none capitalize"
                       >
                         {CYCLES.map(c => <option key={c} value={c}>{c}</option>)}
                       </select>
                    </div>
                 </div>

                 <button 
                  onClick={handleCreate}
                  className="w-full h-14 mt-2 rounded-[1.5rem] bg-primary text-primary-foreground font-black shadow-2xl shadow-primary/30 active:scale-[0.97] transition-all hover:brightness-110"
                 >
                   Save Subscription
                 </button>
              </div>
           </div>
        </div>,
        document.body
      )}
      {selectedItem && createPortal(
        <div className="fixed inset-0 z-[10002] flex items-end justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300 pointer-events-auto" onClick={() => {
          setSelectedItem(null);
          setDeletingId(null);
        }}>
           <motion.div 
             initial={{ y: "100%", opacity: 0 }}
             animate={{ y: 0, opacity: 1 }}
             exit={{ y: "100%", opacity: 0 }}
             transition={{ type: "spring", damping: 30, stiffness: 300 }}
             className="w-full max-w-md bg-card rounded-[3rem] p-7 pt-9 pb-10 shadow-2xl overflow-hidden border border-border/10"
             onClick={e => e.stopPropagation()}
           >
              <AnimatePresence mode="wait">
                {deletingId === selectedItem.id ? (
                  <motion.div 
                    key="delete-confirm"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                  >
                    <div className="text-center space-y-3">
                       <div className="w-16 h-16 rounded-3xl bg-destructive/10 flex items-center justify-center mx-auto mb-4 border border-destructive/20 shadow-inner">
                          <Trash2 size={28} className="text-destructive" />
                       </div>
                       <h2 className="text-2xl font-black tracking-tight">Remove Sub?</h2>
                       <p className="text-[13px] font-medium text-muted-foreground px-4 leading-relaxed">
                         Are you sure you want to delete this subscription? This action cannot be reversed.
                       </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-6">
                       <button 
                         onClick={() => setDeletingId(null)}
                         className="w-full h-14 rounded-2xl bg-secondary text-foreground font-bold hover:bg-secondary/80 transition-all active:scale-[0.97]"
                       >
                         Keep it
                       </button>
                       <button 
                         onClick={() => {
                           confirmDelete();
                           setSelectedItem(null);
                         }}
                         className="h-14 rounded-2xl bg-destructive text-white font-black shadow-xl shadow-destructive/20 hover:brightness-110 transition-all active:scale-[0.97] uppercase tracking-widest text-[11px]"
                       >
                         Delete
                       </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="detail-view"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                  >
                    <div className="flex flex-col items-center text-center space-y-3">
                       <div 
                          className="w-16 h-16 rounded-[22.5%] overflow-hidden flex items-center justify-center bg-black/40 border border-border/10 shadow-xl"
                          style={{ clipPath: 'inset(0% round 22.5%)' }}
                       >
                          <img src={selectedItem.logoUrl} className="w-full h-full object-cover" alt="" />
                       </div>
                       <div>
                          <h2 className="text-xl font-bold tracking-tight">{selectedItem.appName}</h2>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">{selectedItem.cycle} Subscription</p>
                       </div>
                    </div>

                    <div className="bg-secondary/15 rounded-2xl p-4 text-center border border-border/5 my-2">
                       <p className="text-3xl font-black text-destructive tracking-tighter leading-tight flex items-center justify-center">
                         <MoneyDisplay amount={-selectedItem.amount} size="lg" />
                       </p>
                       <p className="text-[9px] font-bold text-muted-foreground mt-1 uppercase tracking-widest leading-none">per {selectedItem.cycle.replace('ly', '').replace('i', 'y')}</p>
                    </div>

                    <div className="space-y-3">
                       <div className="flex items-center justify-between p-3.5 bg-secondary/10 rounded-2xl border border-border/5">
                          <div className="flex items-center gap-3">
                             <Clock size={16} className="text-muted-foreground opacity-60" />
                             <span className="text-xs font-bold">Next Renewal</span>
                          </div>
                          <span className="text-xs font-black text-primary">
                             in {getDaysUntilDue(selectedItem.startDate || selectedItem.createdAt, selectedItem.cycle, selectedItem.createdAt)} days
                          </span>
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                       <button 
                         onClick={() => togglePause(selectedItem.id)}
                         className="h-14 rounded-xl bg-blue-500/10 text-blue-500 font-bold hover:bg-blue-500/20 transition-all active:scale-[0.97] flex items-center justify-center gap-2 border border-blue-500/10"
                       >
                         <Repeat size={16} className={cn("transition-transform duration-500", selectedItem.paused && "rotate-180")} />
                         {selectedItem.paused ? "Resume" : "Pause"}
                       </button>
                       <button 
                         onClick={(e) => handleDeleteTrigger(selectedItem.id, e)}
                         className="h-14 rounded-xl bg-destructive/10 text-destructive font-bold hover:bg-destructive/20 transition-all active:scale-[0.97] flex items-center justify-center gap-2 border border-destructive/10"
                       >
                         <Trash2 size={16} />
                         Delete
                       </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
           </motion.div>
        </div>,
        document.body
      )}
    </div>
  );
}