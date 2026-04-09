
import { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AccountQuickButton } from '@/components/AccountQuickButton';
import { ArrowLeft, CalendarClock, Landmark, Plus, Trash2, X, Info, ChevronRight, History, CreditCard, Receipt, Clock, Save, Trash, Lock } from 'lucide-react';
import { MoneyDisplay } from '@/components/MoneyDisplay';
import { generateId, getLoans, saveLoans, type LoanItem, type LoanTransaction } from '@/lib/storage';
import { useCurrency } from '@/hooks/use-currency';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useBackHandler } from '@/hooks/useBackHandler';
import { NativeAdCard } from '@/components/NativeAdCard';
import { useBannerAd } from '@/hooks/useBannerAd';
import { useProGate } from '@/hooks/useProGate';
import { requestProUpgrade } from '@/lib/proAccess';
import { FREE_LIMITS } from '@/lib/storage';

interface LoansTabProps {
  onOpenAccount: () => void;
  onBack?: () => void;
   bannerAdActive?: boolean;
}

export function LoansTab({ onOpenAccount, onBack, bannerAdActive = true }: LoansTabProps) {
   useBannerAd(bannerAdActive);
   const { isPro } = useProGate();
  const currency = useCurrency();
  const { toast } = useToast();
  const formatMoney = (amount: number) => {
    const formatted = Math.abs(amount).toLocaleString(currency.locale, { maximumFractionDigits: 2 });
    return `${currency.symbol}${formatted}`;
  };

  const getInterestStats = (loan: LoanItem) => {
    const start = new Date(loan.interestStartsOn);
    const end = new Date(loan.dueDate);
    const msPerDay = 1000 * 60 * 60 * 24;
    const rawDayDiff = Math.floor((end.getTime() - start.getTime()) / msPerDay);
    const days = Math.max(1, rawDayDiff + 1);
    const rateDecimal = loan.interestRate / 100;

    const interest = loan.durationType === 'year'
      ? loan.outstandingPrincipal * rateDecimal * (days / 365)
      : loan.outstandingPrincipal * rateDecimal * (days / 30);

    const monthly = loan.durationType === 'year'
      ? loan.outstandingPrincipal * rateDecimal / 12
      : loan.outstandingPrincipal * rateDecimal;

    return { days, monthlyInterest: monthly, totalInterest: interest };
  };

  const normalizeLoan = (raw: LoanItem): LoanItem => {
    const loanName = raw.loanName || raw.personName || 'Loan';
    const direction = raw.direction === 'you-borrowed' ? 'you-borrowed' : 'you-gave';
    const principal = Number(raw.principal) || 0;
    const transactions = Array.isArray(raw.transactions) ? raw.transactions : [];
    const outstanding = Number(raw.outstandingPrincipal);
    return {
      ...raw,
      loanName,
      direction,
      principal,
      outstandingPrincipal: Number.isFinite(outstanding) ? outstanding : principal,
      transactions,
    };
  };

  const [loans, setLoans] = useState<LoanItem[]>(() => getLoans().map(normalizeLoan));
  const [showAdd, setShowAdd] = useState(false);
  const [activeLoanId, setActiveLoanId] = useState<string | null>(null);
  const [pendingDeleteLoan, setPendingDeleteLoan] = useState<LoanItem | null>(null);
  const [actionAmount, setActionAmount] = useState('');
  const [actionType, setActionType] = useState<'add-principal' | 'payment'>('payment');

  useBackHandler(showAdd, () => setShowAdd(false));
  useBackHandler(!!activeLoanId, () => setActiveLoanId(null));
  useBackHandler(!!pendingDeleteLoan, () => setPendingDeleteLoan(null));
  
  useEffect(() => {
    const handleTriggerAdd = (e: any) => {
      if (e.detail?.tabId === 'loans') setShowAdd(true);
    };
    window.addEventListener('splitmate_trigger_add', handleTriggerAdd);
    return () => window.removeEventListener('splitmate_trigger_add', handleTriggerAdd);
  }, []);

  const [form, setForm] = useState({
    loanName: '',
    counterpartyName: '',
    direction: 'you-gave' as 'you-gave' | 'you-borrowed',
    principal: '',
    interestRate: '',
    interestStartsOn: '',
    dueDate: '',
    durationType: 'month' as 'month' | 'year',
    notes: '',
  });

  const totals = useMemo(() => {
    const principal = loans.reduce((sum, loan) => sum + loan.principal, 0);
    const outstanding = loans.reduce((sum, loan) => sum + (loan.closedAt ? 0 : loan.outstandingPrincipal), 0);
    return { principal, outstanding };
  }, [loans]);

  const activeLoan = useMemo(() => loans.find((loan) => loan.id === activeLoanId) || null, [loans, activeLoanId]);

  const persistLoans = (next: LoanItem[]) => {
      const saved = saveLoans(next);
      if (!saved) return false;
      setLoans(next);
      return true;
  };

  const handleCreate = () => {
    const principal = Number(form.principal);
    const interestRate = Number(form.interestRate);
    if (!form.loanName.trim() || !Number.isFinite(principal) || principal <= 0 || !Number.isFinite(interestRate) || interestRate < 0 || !form.interestStartsOn || !form.dueDate) {
      return;
    }

    const item: LoanItem = {
      id: generateId(),
      loanName: form.loanName.trim(),
      counterpartyName: form.counterpartyName.trim() || undefined,
      direction: form.direction,
      principal,
      outstandingPrincipal: principal,
      interestRate,
      interestStartsOn: form.interestStartsOn,
      dueDate: form.dueDate,
      durationType: form.durationType,
      transactions: [],
      notes: form.notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

   const saved = persistLoans([item, ...loans]);
   if (!saved) return;
    setForm({ loanName: '', counterpartyName: '', direction: 'you-gave', principal: '', interestRate: '', interestStartsOn: '', dueDate: '', durationType: 'month', notes: '' });
    setShowAdd(false);
    toast({ title: "Loan Registered", description: `"${item.loanName}" has been added to tracking.` });
  };

  const handleDelete = (id: string) => {
    const loan = loans.find(l => l.id === id);
    if (loan) {
      const txIds = [loan.id, ...loan.transactions.map(tx => tx.id)];
      const pExpenses = JSON.parse(localStorage.getItem('splitmate_personal_expenses') || '[]');
      const nextPExpenses = pExpenses.filter((pe: any) => !txIds.includes(pe.mirrorFromId));
      localStorage.setItem('splitmate_personal_expenses', JSON.stringify(nextPExpenses));
    }

    const next = loans.filter((loan) => loan.id !== id);
   persistLoans(next);
    if (activeLoanId === id) setActiveLoanId(null);
    toast({ title: "Loan Erased", description: "Loan record has been removed." });
  };

  const handleAddTransaction = () => {
    if (!activeLoan) return;
    const amount = Number(actionAmount);
    if (!Number.isFinite(amount) || amount <= 0 || activeLoan.closedAt) return;

    const tx: LoanTransaction = {
      id: generateId(),
      type: actionType,
      amount,
      createdAt: new Date().toISOString(),
    };

    const next = loans.map((loan) => {
      if (loan.id !== activeLoan.id) return loan;
      const change = actionType === 'payment' ? -amount : amount;
      return {
        ...loan,
        outstandingPrincipal: Math.max(0, loan.outstandingPrincipal + change),
        transactions: [tx, ...loan.transactions],
      };
    });

   const saved = persistLoans(next);
   if (!saved) return;
    setActionAmount('');
    toast({ title: "Ledger Updated", description: "Transaction added successfully." });
  };

  const handleCloseLoan = () => {
    if (!activeLoan || activeLoan.closedAt) return;
    const next = loans.map((loan) =>
      loan.id === activeLoan.id
        ? { ...loan, closedAt: new Date().toISOString(), outstandingPrincipal: 0 }
        : loan
    );
   const saved = persistLoans(next);
   if (!saved) return;
    toast({ title: "Loan Managed", description: "This loan is now marked as closed." });
  };

  return (
    <div className="p-4 pb-40 space-y-6">
      {/* Header Section */}
      <div className="pt-4 pb-1 flex items-start justify-between gap-3 font-sans">
        <div className="flex items-start gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="w-11 h-11 rounded-2xl flex items-center justify-center mt-1 bg-secondary/80 border border-border/10 active:scale-95 transition-all"
            >
              <ArrowLeft size={20} strokeWidth={2.5} />
            </button>
          )}
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tight leading-none">Loans</h1>
            <p className="text-sm text-muted-foreground font-medium opacity-70">Track credit and debt cycles</p>
          </div>
        </div>
      </div>

      {/* Summary Card */}
      <div className="p-6 grid grid-cols-2 gap-4 rounded-[2.5rem] bg-card border border-border/40 shadow-sm">
        <div className="rounded-[1.75rem] p-4 bg-primary/5 border border-primary/10">
           <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                 <CreditCard size={12} strokeWidth={3} />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80">Principal</p>
           </div>
           <MoneyDisplay amount={totals.principal} size="lg" className="font-black tracking-tighter" />
        </div>
        <div className="rounded-[1.75rem] p-4 bg-warning/5 border border-warning/10">
           <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-warning/10 flex items-center justify-center text-warning">
                 <Clock size={12} strokeWidth={3} />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80">Outstanding</p>
           </div>
           <MoneyDisplay amount={totals.outstanding} size="lg" className="font-black tracking-tighter text-warning" />
        </div>
      </div>

      {/* Loans List */}
      {loans.length === 0 ? (
        <div className="p-16 text-center rounded-[3rem] bg-secondary/15 border border-dashed border-border/40">
           <Landmark className="mx-auto mb-4 text-muted-foreground/20" size={56} strokeWidth={1.5} />
           <p className="text-sm font-bold text-muted-foreground/50 italic px-6 leading-relaxed">No active loan records. Tap + to register a credit or debt.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
               {loans.map((loan, idx) => {
                  const isLockedLoan = !isPro && idx >= FREE_LIMITS.MAX_LOANS;
            const stats = getInterestStats(loan);
            const dueAmount = loan.outstandingPrincipal + stats.totalInterest;
            const signedDueAmount = loan.direction === 'you-borrowed' ? -dueAmount : dueAmount;
            const signedMonthlyInterest = loan.direction === 'you-borrowed' ? -stats.monthlyInterest : stats.monthlyInterest;
            const signedTotalInterest = loan.direction === 'you-borrowed' ? -stats.totalInterest : stats.totalInterest;
            const signedOutstanding = loan.direction === 'you-borrowed' ? -loan.outstandingPrincipal : loan.outstandingPrincipal;
            const isClosed = Boolean(loan.closedAt);
            const isYouGave = loan.direction === 'you-gave';
            
            return (
              <div key={loan.id} className="contents">
                        <button
                           onClick={() => {
                              if (isLockedLoan) {
                                 requestProUpgrade('loans', 'Free users can track 1 loan. Upgrade to Pro for unlimited loans.');
                                 return;
                              }
                              setActiveLoanId(loan.id);
                           }}
                  className={cn(
                    "group relative flex flex-col p-6 rounded-[2.5rem] bg-card border transition-all duration-300 active:scale-[0.98] text-left overflow-hidden shadow-sm hover:shadow-xl",
                                isLockedLoan && "opacity-40",
                    isClosed ? "border-border/30 grayscale opacity-80" : "border-border/40"
                  )}
                >
                           {isLockedLoan && (
                              <>
                                 <div className="absolute top-3 right-3 z-30 w-7 h-7 rounded-lg bg-black/55 border border-white/20 flex items-center justify-center">
                                    <Lock size={12} className="text-white" />
                                 </div>
                                 <button
                                    type="button"
                                    onClick={(e) => {
                                       e.stopPropagation();
                                       requestProUpgrade('loans', 'Free users can track 1 loan. Upgrade to Pro for unlimited loans.');
                                    }}
                                    className="absolute inset-0 z-40 pointer-events-auto"
                                    aria-label="Upgrade to unlock this loan"
                                 />
                              </>
                           )}
                  <div className="flex items-start justify-between gap-4 mb-6">
                     <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner",
                          isYouGave ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                        )}>
                           <Landmark size={22} strokeWidth={2.5} />
                        </div>
                        <div className="min-w-0">
                           <h3 className="font-extrabold text-[15px] truncate leading-tight tracking-tight uppercase mb-1">{loan.loanName}</h3>
                           <div className="flex items-center gap-2">
                             <span className={cn(
                                 "text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest",
                                 isYouGave ? "bg-success/15 text-success" : "bg-warning/20 text-warning"
                               )}>
                               {isYouGave ? 'You Lent' : 'You Borrowed'}
                             </span>
                             {loan.counterpartyName && <span className="text-[10px] font-bold text-muted-foreground/60 italic leading-none">w/ {loan.counterpartyName}</span>}
                           </div>
                        </div>
                     </div>
                     <div className="text-right flex flex-col items-end">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-1">Estimated Due</p>
                        <MoneyDisplay amount={signedDueAmount} size="sm" className="font-black" />
                        <p className="text-[9px] font-black text-muted-foreground/50 mt-0.5">{stats.days} DAYS TERM</p>
                     </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-6">
                     {[
                       { label: 'Principal', val: signedOutstanding, color: 'text-foreground' },
                       { label: 'Interest', val: signedTotalInterest, color: 'text-primary' },
                       { label: 'Per Month', val: signedMonthlyInterest, color: isYouGave ? 'text-success' : 'text-danger', isSpecial: true }
                     ].map((item) => (
                       <div key={item.label} className="rounded-2xl p-3 bg-secondary/30 border border-border/10">
                          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1.5">{item.label}</p>
                          {item.isSpecial ? (
                             <p className={cn("text-[11px] font-black", item.color)}>
                                {item.val < 0 ? '-' : '+'}{formatMoney(item.val)}
                             </p>
                          ) : (
                             <MoneyDisplay amount={item.val} size="sm" className={cn("font-black", item.color)} />
                          )}
                       </div>
                     ))}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-border/10">
                     <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                           <CalendarClock size={12} className="text-muted-foreground/60" />
                           <span className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest">DUE {new Date(loan.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }).toUpperCase()}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                           <div className="w-4 h-1.5 rounded-full bg-primary/20" />
                           <span className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest font-mono">{loan.interestRate}% {loan.durationType.toUpperCase()}LY</span>
                        </div>
                     </div>
                     <ChevronRight size={16} className="text-muted-foreground/40 group-hover:translate-x-1 transition-transform" />
                  </div>
                  
                  {isClosed && (
                     <div className="absolute inset-0 bg-secondary/5 backdrop-blur-[1px] flex items-center justify-center">
                        <div className="bg-background/90 px-5 py-2 rounded-full border border-border/30 shadow-2xl overflow-hidden transform -rotate-12">
                           <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/60">Settled Account</p>
                        </div>
                     </div>
                  )}
                </button>
                {idx === 0 && <NativeAdCard />}
              </div>
            );
          })}
        </div>
      )}

      {/* Info Warning */}
      <div className="p-4 rounded-[1.75rem] bg-indigo-500/10 border border-indigo-500/20 flex gap-4 text-indigo-600">
        <div className="shrink-0 mt-0.5"><Info size={16} strokeWidth={2.5} /></div>
        <p className="text-[10px] font-bold leading-relaxed italic opacity-80">
          Disclaimer: Interest is calculated using the simple interest formula from start date to due date. Payments are applied immediately to the principal balance.
        </p>
      </div>

      {/* CREATE LOAN MODAL */}
      {showAdd && createPortal(
        <div className="fixed inset-0 z-[10001] flex items-end justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowAdd(false)}>
           <div className="w-full max-w-md bg-card rounded-[2.5rem] overflow-hidden animate-in slide-in-from-bottom-10 duration-300 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-border/10 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                       <Landmark size={18} strokeWidth={2.5} />
                    </div>
                    <h3 className="font-black text-lg tracking-tight uppercase">New Ledger</h3>
                 </div>
                 <button className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center active:scale-90 transition-all font-sans" onClick={() => setShowAdd(false)}>
                    <X size={18} className="text-muted-foreground" />
                 </button>
              </div>
              <div className="p-7 space-y-4 font-sans">
                 <div className="space-y-3">
                    <input 
                       value={form.loanName} 
                       onChange={(e) => setForm((prev) => ({ ...prev, loanName: e.target.value }))} 
                       placeholder="ACCOUNT NAME (e.g. UNIVERSITY LOAN)" 
                       className="w-full h-14 px-5 rounded-2xl text-[14px] font-bold bg-secondary/40 border border-border/10 focus:ring-2 focus:ring-primary/20 placeholder:text-[10px] placeholder:font-black placeholder:tracking-widest placeholder:text-muted-foreground/50" 
                    />
                    <input 
                       value={form.counterpartyName} 
                       onChange={(e) => setForm((prev) => ({ ...prev, counterpartyName: e.target.value }))} 
                       placeholder="PARTNER NAME (OPTIONAL)" 
                       className="w-full h-14 px-5 rounded-2xl text-[14px] font-bold bg-secondary/40 border border-border/10 focus:ring-2 focus:ring-primary/20 placeholder:text-[10px] placeholder:font-black placeholder:tracking-widest placeholder:text-muted-foreground/50" 
                    />
                 </div>
                 
                 <div className="flex gap-2">
                    <button 
                       onClick={() => setForm((prev) => ({ ...prev, direction: 'you-gave' }))} 
                       className={cn(
                          "flex-1 h-14 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                          form.direction === 'you-gave' ? "bg-success text-white shadow-lg shadow-success/20 scale-105 z-10" : "bg-card border border-border/20 text-muted-foreground"
                       )}
                    >
                       You Lent
                    </button>
                    <button 
                       onClick={() => setForm((prev) => ({ ...prev, direction: 'you-borrowed' }))} 
                       className={cn(
                          "flex-1 h-14 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                          form.direction === 'you-borrowed' ? "bg-warning text-white shadow-lg shadow-warning/20 scale-105 z-10" : "bg-card border border-border/20 text-muted-foreground"
                       )}
                    >
                       You Took
                    </button>
                 </div>

                 <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                       <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-black text-xs">{currency.symbol}</span>
                       <input 
                          type="number" 
                          value={form.principal} 
                          onChange={(e) => setForm((prev) => ({ ...prev, principal: e.target.value }))} 
                          placeholder="PRINCIPAL" 
                          className="w-full h-14 pl-10 pr-4 rounded-2xl text-[14px] font-black bg-secondary/40 border border-border/10 focus:ring-2 focus:ring-primary/20 placeholder:text-[9px] placeholder:font-black placeholder:tracking-widest placeholder:text-muted-foreground/50" 
                       />
                    </div>
                    <div className="relative">
                       <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-black text-xs">%</span>
                       <input 
                          type="number" 
                          value={form.interestRate} 
                          onChange={(e) => setForm((prev) => ({ ...prev, interestRate: e.target.value }))} 
                          placeholder="INTEREST" 
                          className="w-full h-14 pl-4 pr-10 rounded-2xl text-[14px] font-black bg-secondary/40 border border-border/10 focus:ring-2 focus:ring-primary/20 placeholder:text-[9px] placeholder:font-black placeholder:tracking-widest placeholder:text-muted-foreground/50" 
                       />
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                       <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/70 px-1">Start Date</p>
                       <input 
                          type="date" 
                          value={form.interestStartsOn} 
                          onChange={(e) => setForm((prev) => ({ ...prev, interestStartsOn: e.target.value }))} 
                          className="w-full h-14 px-4 rounded-2xl text-xs font-bold bg-secondary/40 border border-border/10 focus:ring-2 focus:ring-primary/20" 
                       />
                    </div>
                    <div className="space-y-1">
                       <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/70 px-1">Due Date</p>
                       <input 
                          type="date" 
                          value={form.dueDate} 
                          onChange={(e) => setForm((prev) => ({ ...prev, dueDate: e.target.value }))} 
                          className="w-full h-14 px-4 rounded-2xl text-xs font-bold bg-secondary/40 border border-border/10 focus:ring-2 focus:ring-primary/20" 
                       />
                    </div>
                 </div>

                 <div className="flex gap-2 p-1.5 bg-secondary/30 rounded-2xl border border-border/10">
                    <button 
                       onClick={() => setForm((prev) => ({ ...prev, durationType: 'month' }))} 
                       className={cn(
                          "flex-1 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                          form.durationType === 'month' ? "bg-background text-primary shadow-sm" : "text-muted-foreground"
                       )}
                    >
                       Monthly
                    </button>
                    <button 
                       onClick={() => setForm((prev) => ({ ...prev, durationType: 'year' }))} 
                       className={cn(
                          "flex-1 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                          form.durationType === 'year' ? "bg-background text-primary shadow-sm" : "text-muted-foreground"
                       )}
                    >
                       Yearly
                    </button>
                 </div>

                 <button 
                    onClick={handleCreate} 
                    className="w-full h-14 rounded-2xl text-[11px] font-black uppercase tracking-widest bg-primary text-white shadow-xl shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                 >
                    <Save size={18} strokeWidth={2.5} />
                    Establish Loan
                 </button>
              </div>
           </div>
        </div>,
        document.body
      )}

      {/* LOAN ACTIONS MODAL */}
      {activeLoan && createPortal(
        <div className="fixed inset-0 z-[10002] flex items-end justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setActiveLoanId(null)}>
           <div className="w-full max-w-md bg-card rounded-[2.5rem] overflow-hidden animate-in slide-in-from-bottom-10 duration-300 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-border/10">
                 <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-2xl bg-secondary/80 border border-border/20 flex items-center justify-center text-primary">
                          <History size={18} strokeWidth={2.5} />
                       </div>
                       <div>
                          <h3 className="font-black text-[15px] tracking-tight uppercase leading-none">{activeLoan.loanName}</h3>
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mt-1">Transaction Ledger</p>
                       </div>
                    </div>
                    {activeLoan.closedAt ? (
                       <button onClick={() => setPendingDeleteLoan(activeLoan)} className="w-10 h-10 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center active:scale-90 transition-all">
                          <Trash size={18} strokeWidth={2.5} />
                       </button>
                    ) : (
                       <button onClick={() => setActiveLoanId(null)} className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center active:scale-90 transition-all">
                          <X size={18} />
                       </button>
                    )}
                 </div>
                 
                 <div className="bg-secondary/30 rounded-[1.75rem] p-5 border border-border/10 flex items-center justify-between shadow-inner">
                    <div>
                       <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Current Principal</p>
                       <MoneyDisplay amount={activeLoan.direction === 'you-borrowed' ? -activeLoan.outstandingPrincipal : activeLoan.outstandingPrincipal} size="md" className="font-black" />
                    </div>
                    <div className="w-px h-8 bg-border/20 mx-2" />
                    <div className="text-right">
                       <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Status</p>
                       <span className={cn(
                          "text-[9px] font-black uppercase px-2.5 py-1 rounded-full",
                          activeLoan.closedAt ? "bg-secondary text-muted-foreground border border-border/20" : "bg-primary text-white shadow-sm"
                       )}>
                          {activeLoan.closedAt ? 'Settled' : 'Active Cycle'}
                       </span>
                    </div>
                 </div>
              </div>

              <div className="p-7 space-y-7 font-sans">
                 {!activeLoan.closedAt && (
                    <div className="space-y-4">
                       <div className="flex gap-2">
                          <button 
                             onClick={() => setActionType('payment')} 
                             className={cn(
                                "flex-1 h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                                actionType === 'payment' ? "bg-success text-white shadow-xl shadow-success/20 scale-105 z-10" : "bg-card border border-border/30 text-muted-foreground"
                             )}
                          >
                             {activeLoan.direction === 'you-gave' ? 'Pymt Received' : 'Pay Installment'}
                          </button>
                          <button 
                             onClick={() => setActionType('add-principal')} 
                             className={cn(
                                "flex-1 h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                                actionType === 'add-principal' ? "bg-warning text-white shadow-xl shadow-warning/20 scale-105 z-10" : "bg-card border border-border/30 text-muted-foreground"
                             )}
                          >
                             Invest More
                          </button>
                       </div>
                       
                       <div className="flex gap-3">
                          <div className="relative flex-1">
                             <span className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground font-black text-xs">{currency.symbol}</span>
                             <input 
                                type="number" 
                                value={actionAmount} 
                                onChange={(e) => setActionAmount(e.target.value)} 
                                placeholder="ENTER AMOUNT" 
                                className="w-full h-14 pl-10 pr-4 rounded-2xl text-[14px] font-black bg-secondary/40 border border-border/10 focus:ring-2 focus:ring-primary/20 placeholder:text-[9px] placeholder:font-black placeholder:tracking-widest placeholder:text-muted-foreground/60" 
                             />
                          </div>
                          <button 
                             onClick={handleAddTransaction} 
                             className="h-14 px-8 rounded-2xl bg-primary text-white font-black text-[11px] uppercase tracking-widest shadow-xl shadow-primary/20 active:scale-95 transition-all"
                          >
                             Commit
                          </button>
                       </div>
                       
                       <button 
                          onClick={handleCloseLoan} 
                          className="w-full h-12 rounded-2xl bg-destructive/5 text-destructive font-black text-[10px] uppercase tracking-[0.2em] border border-destructive/10 active:scale-95 transition-all"
                       >
                          Close Loan Lifecycle
                       </button>
                    </div>
                 )}

                 <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 px-1">Ledger Timeline</p>
                    <div className="space-y-3 max-h-56 overflow-y-auto pr-2 no-scrollbar">
                       {activeLoan.transactions.length === 0 ? (
                          <div className="p-10 text-center bg-secondary/15 rounded-[2.5rem] w-full border border-border/5">
                             <Receipt size={32} className="mx-auto mb-3 text-muted-foreground/10" />
                             <p className="text-[11px] font-bold text-muted-foreground/40 italic">Account history empty</p>
                          </div>
                       ) : (
                          activeLoan.transactions.map((tx) => (
                             <div key={tx.id} className="rounded-2xl p-4 flex items-center justify-between bg-card border border-border/30 shadow-sm w-full transition-transform active:scale-[0.99]">
                                <div className="flex items-center gap-3">
                                   <div className={cn(
                                      "w-1.5 h-8 rounded-full",
                                      tx.type === 'payment' ? "bg-success/60 shadow-[0_0_10px_rgba(var(--success),0.1)]" : "bg-warning/60 shadow-[0_0_10px_rgba(var(--warning),0.1)]"
                                   )} />
                                   <div>
                                      <p className="font-extrabold text-[13px] tracking-tight">{tx.type === 'payment' ? 'Payment' : 'Principal Add'}</p>
                                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mt-0.5">{new Date(tx.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                   </div>
                                </div>
                                <div className="text-right">
                                   <MoneyDisplay
                                      amount={
                                         activeLoan.direction === 'you-borrowed'
                                            ? (tx.type === 'payment' ? -tx.amount : tx.amount)
                                            : (tx.type === 'payment' ? tx.amount : -tx.amount)
                                      }
                                      size="sm"
                                      className={cn("font-black", tx.type === 'payment' ? "text-success" : "text-warning")}
                                   />
                                </div>
                             </div>
                          ))
                       )}
                    </div>
                 </div>
              </div>
              <div className="p-6 pt-0 opacity-60 text-center">
                 <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Tap outside to dismiss ledger</p>
              </div>
           </div>
        </div>,
        document.body
      )}

      {/* DELETE CONFIRMATION */}
      {pendingDeleteLoan && createPortal(
         <div className="fixed inset-0 z-[10003] flex items-end justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setPendingDeleteLoan(null)}>
            <div className="w-full max-w-md bg-card rounded-[2.5rem] p-8 pt-10 pb-12 space-y-6 animate-in slide-in-from-bottom-10 border border-border/20 duration-300 shadow-2xl" onClick={e => e.stopPropagation()}>
               <div className="text-center space-y-4">
                  <div className="w-20 h-20 rounded-[2.5rem] bg-destructive/10 flex items-center justify-center mx-auto mb-4 animate-pulse border border-destructive/20">
                     <Trash2 size={36} className="text-destructive" />
                  </div>
                  <h2 className="text-xl font-black tracking-tight text-destructive uppercase">Purge Loan Data?</h2>
                  <p className="text-sm text-muted-foreground px-6 leading-relaxed font-bold italic opacity-80">
                     Permanently erase "{pendingDeleteLoan.loanName}" and its entire transaction cycle.
                  </p>
               </div>
               <div className="grid grid-cols-2 gap-4 pt-4">
                  <button onClick={() => setPendingDeleteLoan(null)} className="h-14 rounded-2xl bg-secondary font-black uppercase tracking-widest text-[11px] border border-border/10 active:scale-95 transition-all">Retain</button>
                  <button onClick={() => { handleDelete(pendingDeleteLoan.id); setPendingDeleteLoan(null); }} className="h-14 rounded-2xl bg-destructive text-white font-black uppercase tracking-widest text-[11px] shadow-xl shadow-destructive/30 active:scale-95 transition-all">Destroy</button>
               </div>
            </div>
         </div>,
         document.body
      )}
    </div>
  );
}
