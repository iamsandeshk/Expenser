
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Trash2, History, TrendingUp, TrendingDown, DollarSign, BarChart3, ArrowUpRight, ArrowDownRight, Plus, Pencil, Check, Calendar, X, Share2, Copy, AlertCircle, RefreshCw, Users, Users2 } from 'lucide-react';
import { MoneyDisplay } from '@/components/MoneyDisplay';
import { ExpenseChart } from '@/components/ExpenseChart';
import {
  getPersonBalances,
  deleteSharedExpense,
  updateSharedExpenseReason,
  syncExpensesWithPerson,
  applySyncUpdate,
  settleExpenseWithPerson,
  unsettleExpenseWithPerson,
  toggleSharedExpenseSettlement,
  getPersonProfile,
  savePersonProfile,
  deletePerson,
  updatePersonName,
  getAccountProfile,
  type PersonBalance,
  type SharedExpense
} from '@/lib/storage';
import { toast } from 'sonner';
import { BottomNavigation } from '@/components/BottomNavigation';
import { AddSharedExpenseModal } from '@/components/modals/AddSharedExpenseModal';
import { cn } from '@/lib/utils';
import { createPortal } from 'react-dom';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Share } from '@capacitor/share';
import { STORAGE_KEYS } from '@/lib/storage';
import { useBannerAd } from '@/hooks/useBannerAd';
import { NativeAdCard } from '@/components/NativeAdCard';
import { useAdFree } from '@/hooks/useAdFree';
import React from 'react';

export default function PersonDetailsPage() {
  useBannerAd();
  const { isAdFree } = useAdFree();
  const { personName } = useParams<{ personName: string }>();
  const navigate = useNavigate();
  const [person, setPerson] = useState<PersonBalance | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showPersonDeleteConfirm, setShowPersonDeleteConfirm] = useState(false);
  const [showSettleConfirm, setShowSettleConfirm] = useState(false);
  const [showRollbackConfirm, setShowRollbackConfirm] = useState(false);
  const [email, setEmail] = useState('');
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [linkedEmail, setLinkedEmail] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<'UPI' | 'CASH'>('UPI');
  const [settleDate, setSettleDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewingTransaction, setViewingTransaction] = useState<SharedExpense | null>(null);
  const [isEditingReason, setIsEditingReason] = useState(false);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState('');
  const [showCollabModal, setShowCollabModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const myEmail = getAccountProfile().email;

  const loadExpenses = () => {
    if (!personName) return;

    const decodedName = decodeURIComponent(personName);

    const all = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.SHARED_EXPENSES) || '[]'
    );

    const filtered = all.filter(
      (e: any) => e.personName === decodedName
    );

    setExpenses(filtered);
  };

  useEffect(() => {
    loadExpenses();
  }, [personName]);

  const refreshPersonData = () => {
    if (personName) {
      const decodedName = decodeURIComponent(personName);
      const personBalances = getPersonBalances(true);
      const foundPerson = personBalances.find(p => p.name === decodedName);
      setPerson(foundPerson || null);
    }
  };

  useEffect(() => {
    const refresh = () => {
      loadExpenses();
      refreshPersonData();
      
      // Also refresh the profile/email if it was automatically linked via SyncManager
      if (personName) {
        const decodedName = decodeURIComponent(personName);
        const profile = getPersonProfile(decodedName);
        if (profile) {
          setLinkedEmail(profile.email || '');
          setEmail(profile.email || '');
        }
      }
    };

    window.addEventListener('splitmate_data_changed', refresh);

    return () => {
      window.removeEventListener('splitmate_data_changed', refresh);
    };
  }, [personName]);


  useEffect(() => {
    if (personName) {
      const decodedName = decodeURIComponent(personName);
      const profile = getPersonProfile(decodedName);
      if (profile) {
        setLinkedEmail(profile.email);
        setEmail(profile.email || '');
      }
    }
  }, [personName]);

  const handleSaveEmail = () => {
    if (personName) {
      const decodedName = decodeURIComponent(personName);
      let finalEmail = email.trim();
      
      // Auto-append @gmail.com if no domain is provided
      if (finalEmail && !finalEmail.includes('@')) {
        finalEmail += '@gmail.com';
      }
      
      const profile = { name: decodedName, email: finalEmail };
      savePersonProfile(profile);
      setLinkedEmail(finalEmail || undefined);
      setEmail(finalEmail); // Update local state for consistency
      setIsEditingEmail(false);
    }
  };

  const handleRename = () => {
    if (person && newName.trim() && newName.trim() !== person.name) {
      updatePersonName(person.name, newName.trim());
      navigate(`/person/${encodeURIComponent(newName.trim())}`, { replace: true });
      setIsRenaming(false);
    }
  };

  useEffect(() => {
    if (personName) {
      const personBalances = getPersonBalances(true);
      const foundPerson = personBalances.find(p => p.name === decodeURIComponent(personName));
      setPerson(foundPerson || null);
    }
  }, [personName]);

  // Handle system back gesture
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let handleRef: { remove: () => Promise<void> } | null = null;
    const attach = async () => {
      handleRef = await CapacitorApp.addListener('backButton', () => {
        if (showCollabModal) {
          setShowCollabModal(false);
          setIsEditingEmail(false);
          return;
        }
        if (showAddModal) {
          setShowAddModal(false);
          return;
        }
        if (showPersonDeleteConfirm) {
          setShowPersonDeleteConfirm(false);
          return;
        }
        if (showSettleConfirm) {
          setShowSettleConfirm(false);
          return;
        }
        if (showRollbackConfirm) {
          setShowRollbackConfirm(false);
          return;
        }
        if (viewingTransaction) {
          setViewingTransaction(null);
          setIsEditingReason(false);
          return;
        }
        if (deletingId) {
          setDeletingId(null);
          return;
        }
        if (isEditingEmail) {
          setIsEditingEmail(false);
          return;
        }

        // Return using navigation history (matching the UI back button)
        navigate(-1);
      });
    };

    void attach();
    return () => {
      if (handleRef) void handleRef.remove();
    };
  }, [navigate, showPersonDeleteConfirm, showSettleConfirm, showRollbackConfirm, deletingId, isEditingEmail, showAddModal]);


  const confirmSettle = () => {
    if (person) {
      settleExpenseWithPerson(person.name, paymentMode, new Date(settleDate).toISOString());
      // Refresh person data
      const updatedBalances = getPersonBalances(true);
      const updatedPerson = updatedBalances.find(p => p.name === person.name);
      setPerson(updatedPerson || null);
      setShowSettleConfirm(false);
    }
  };

  const confirmRollback = () => {
    if (person) {
      unsettleExpenseWithPerson(person.name);
      // Refresh person data
      const updatedBalances = getPersonBalances(true);
      const updatedPerson = updatedBalances.find(p => p.name === person.name);
      setPerson(updatedPerson || null);
      setShowRollbackConfirm(false);
    }
  };

  const handleToggleSettlement = (id: string) => {
    toggleSharedExpenseSettlement(id);
    if (personName) {
      const updatedBalances = getPersonBalances(true);
      const updatedPerson = updatedBalances.find(p => p.name === decodeURIComponent(personName));
      setPerson(updatedPerson || null);
    }
  };

  const handleDeleteTrigger = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setDeletingId(id);
  };

  const confirmDelete = () => {
    if (!deletingId) return;

    const expenses = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.SHARED_EXPENSES) || '[]'
    );

    const exp = expenses.find((e: any) => e.id === deletingId);

    if (!exp || exp.fromEmail !== getAccountProfile().email) {
      toast.error("You can't delete this expense");
      setDeletingId(null);
      return;
    }

    deleteSharedExpense(deletingId);

    refreshPersonData();
    setDeletingId(null);
  };

  const confirmDeletePerson = () => {
    if (person) {
      deletePerson(person.name);
      // Instead of letting it 404, we navigate to Shared
      navigate('/', { replace: true, state: { tabId: 'shared' } });
    }
  };

  if (!person) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="w-20 h-20 rounded-[2.5rem] bg-secondary flex items-center justify-center shadow-xl">
          <Trash2 size={32} className="text-muted-foreground/30" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black">Person Removed</h2>
          <p className="text-muted-foreground max-w-[240px]">This contact and their history have been deleted.</p>
        </div>
        <button
          onClick={() => navigate('/')}
          className="h-14 px-10 rounded-2xl bg-primary text-primary-foreground font-black shadow-xl shadow-primary/20 active:scale-95 transition-all"
        >
          Return to Shared
        </button>
      </div>
    );
  }

  const sortedTransactions = person.transactions.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Create chart data for transaction flow
  const flowData = [
    { name: 'They Gave You', value: person.totalGiven, color: 'hsl(149, 100%, 57%)' },
    { name: 'You Gave Them', value: person.totalOwed, color: 'hsl(0, 91%, 71%)' }
  ].filter(item => item.value > 0);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30" style={{ background: 'hsl(var(--background) / 0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid hsl(var(--border) / 0.35)' }}>
        <div className="flex items-center justify-between px-4 py-3.5 pt-safe-top">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-90"
            style={{ background: 'hsl(var(--secondary) / 0.8)' }}
          >
            <ArrowLeft size={18} />
          </button>
          <div className="text-center flex-1 mx-2">
            {isRenaming ? (
              <div className="flex items-center gap-2 max-w-[200px] mx-auto animate-in fade-in zoom-in-95 duration-200">
                <input
                  autoFocus
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full h-9 bg-secondary/80 rounded-xl px-3 text-sm font-black uppercase tracking-tight border border-primary/30 outline-none focus:ring-2 ring-primary/10 transition-all placeholder:text-muted-foreground/20 shadow-inner"
                  onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                  placeholder="NEW NAME"
                />
                <button 
                  onClick={handleRename} 
                  className="w-9 h-9 flex-shrink-0 flex items-center justify-center bg-primary text-white rounded-xl shadow-lg shadow-primary/25 active:scale-90 transition-all border border-white/10"
                >
                  <Check size={18} strokeWidth={4} />
                </button>
              </div>
            ) : (
              <>
                <h1 className="text-lg font-black tracking-tight uppercase truncate max-w-[180px] mx-auto leading-none">
                  {person.name === 'me' ? 'My Ledger' : person.name}
                </h1>
                <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest mt-1">
                  {person.transactions.length} record{person.transactions.length !== 1 ? 's' : ''}
                </p>
              </>
            )}
          </div>
          <div className="flex items-center gap-1.5 overflow-hidden">
            {person.name !== 'me' && (
              <>
                <button
                  onClick={() => setShowCollabModal(true)}
                  className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center transition-all bg-secondary/80",
                    linkedEmail ? "text-success" : "text-muted-foreground"
                  )}
                >
                  <Users size={16} />
                </button>
                <button
                  onClick={() => {
                    if (isRenaming) {
                      setIsRenaming(false);
                    } else {
                      setNewName(person.name);
                      setIsRenaming(true);
                    }
                  }}
                  className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center transition-all",
                    isRenaming ? "bg-primary text-white" : "bg-secondary/80 text-muted-foreground"
                  )}
                >
                  {isRenaming ? <X size={16} /> : <Pencil size={16} />}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Balance Cards with Graphics */}
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="ios-card-modern p-4 space-y-2 relative overflow-hidden">
            <div className="absolute top-2 right-2 opacity-[0.12]">
              <TrendingUp size={36} className="text-green-400" />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-400/15 rounded-xl flex items-center justify-center">
                <TrendingUp size={15} className="text-green-400" />
              </div>
              <p className="text-xs text-muted-foreground font-semibold">They gave you</p>
            </div>
            <MoneyDisplay amount={person.totalGiven} size="lg" className="text-green-400" />
          </div>

          <div className="ios-card-modern p-4 space-y-2 relative overflow-hidden">
            <div className="absolute top-2 right-2 opacity-[0.12]">
              <TrendingDown size={36} className="text-red-400" />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-red-400/15 rounded-xl flex items-center justify-center">
                <TrendingDown size={15} className="text-red-400" />
              </div>
              <p className="text-xs text-muted-foreground font-semibold">You gave them</p>
            </div>
            <MoneyDisplay amount={person.totalOwed} size="lg" className="text-red-400" />
          </div>
        </div>

        {/* Net Balance Card */}
        <div
          className="p-5 text-center space-y-3 relative overflow-hidden"
          style={{
            background: person.netBalance >= 0
              ? 'linear-gradient(135deg, hsl(var(--success) / 0.12) 0%, hsl(var(--card)) 60%)'
              : 'linear-gradient(135deg, hsl(var(--danger) / 0.12) 0%, hsl(var(--card)) 60%)',
            border: `1px solid ${person.netBalance >= 0 ? 'hsl(var(--success) / 0.2)' : 'hsl(var(--danger) / 0.2)'}`,
            borderRadius: '2.25rem',
          }}
        >
          <div className="absolute top-4 right-4 opacity-[0.07]">
            <DollarSign size={52} className="text-primary" />
          </div>
          
          {person.name !== 'me' && linkedEmail && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsSyncing(true);
                syncExpensesWithPerson(person.name);
                setTimeout(() => {
                  setIsSyncing(false);
                  toast.success("Synchronized!", { 
                    description: "Transactions are now up to date.",
                    icon: <Check size={14} className="text-success" />
                  });
                }, 1000);
              }}
              className={cn(
                "absolute top-4 left-4 w-10 h-10 rounded-2xl flex items-center justify-center transition-all z-10 backdrop-blur-md border border-white/5 shadow-lg",
                isSyncing 
                  ? "bg-success/20 text-success animate-spin border-success/30" 
                  : "bg-secondary/40 text-muted-foreground/60 hover:bg-secondary/60 active:scale-90"
              )}
            >
              <RefreshCw size={16} strokeWidth={2.5} />
            </button>
          )}

          <div className="flex items-center justify-center gap-2">
            <div className="w-8 h-8 bg-primary/15 rounded-xl flex items-center justify-center">
              <DollarSign size={16} className="text-primary" />
            </div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Net Balance</p>
          </div>
          <MoneyDisplay amount={person.netBalance} size="xl" showSign={true} />
          <p className="text-xs text-muted-foreground">
            {person.netBalance > 0 ? "They owe you" : person.netBalance < 0 ? "You owe them" : "All settled! 🎉"}
          </p>

          <div className="flex flex-col gap-2 mt-2">
            {person.netBalance !== 0 && (
              <button
                onClick={() => setShowSettleConfirm(true)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm"
                style={{
                  background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-glow)))',
                  color: 'hsl(var(--primary-foreground))',
                  boxShadow: '0 4px 16px -4px hsl(var(--primary) / 0.4)',
                }}
              >
                <CheckCircle2 size={18} />
                Settle Up
              </button>
            )}

            {person.transactions.some(t => t.settled) && (
              <button
                onClick={() => setShowRollbackConfirm(true)}
                className={cn(
                  "w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl font-semibold text-[11px] transition-all",
                  person.netBalance === 0 ? "bg-secondary text-secondary-foreground" : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                )}
              >
                <TrendingDown size={14} className="opacity-60" />
                Undo Settlement
              </button>
            )}
          </div>
        </div>

        {/* Transaction Flow Chart */}
        {flowData.length > 0 && (
          <div className="ios-card-modern p-5 space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-400/15 rounded-xl flex items-center justify-center">
                <BarChart3 size={15} className="text-blue-400" />
              </div>
              Money Flow
            </h3>
            <div className="flex justify-center py-2">
              <ExpenseChart data={flowData} type="pie" height={190} />
            </div>
          </div>
        )}
      </div>

      {/* Transactions List */}
      <div className="px-4 pb-4">
        <h3 className="font-semibold text-xs uppercase tracking-widest text-muted-foreground mb-3 px-1 flex items-center gap-2" style={{ letterSpacing: '0.08em' }}>
          <div className="w-6 h-6 bg-primary/15 rounded-lg flex items-center justify-center">
            <History size={12} className="text-primary" />
          </div>
          Transaction History
        </h3>

        {sortedTransactions.length === 0 ? (
          <div className="ios-card-modern p-8 text-center">
            <div className="w-12 h-12 bg-muted/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <History size={24} className="text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-semibold text-sm">No transactions</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            {sortedTransactions.map((transaction, idx) => (
              <div key={transaction.id} className="contents shadow-none">
                <div onClick={() => setViewingTransaction(transaction)} className="ios-card-modern px-4 py-3.5 group active:scale-[0.98] transition-all cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{
                          background: transaction.paidBy === 'me' ? 'hsl(var(--danger) / 0.1)' : 'hsl(var(--success) / 0.1)',
                        }}>
                        {transaction.paidBy === 'me'
                          ? <ArrowUpRight size={14} className="text-danger" />
                          : <ArrowDownRight size={14} className="text-success" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate uppercase tracking-tight leading-none mb-1">
                          {transaction.reason || 'Shared expense'}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground/60 uppercase font-bold tracking-tighter">
                          <span>{new Date(transaction.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                          <span className="opacity-20">•</span>
                          <span>{transaction.paidBy === 'me' ? 'You paid' : `${person.name} paid`}</span>
                          {transaction.settled && (
                            <>
                              <span className="opacity-20">•</span>
                              <span className="text-success scale-90">Settled</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-2">
                      <div className="text-right shrink-0">
                        <MoneyDisplay
                          amount={transaction.amount}
                          size="sm"
                          className={cn("font-black tracking-tighter", transaction.paidBy === 'me' ? 'text-red-500' : 'text-green-500')}
                        />
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {(transaction.createdByMe !== false && !transaction.isIncoming) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTrigger(transaction.id);
                            }}
                            className="w-10 h-10 flex items-center justify-center text-danger bg-danger/5 rounded-2xl transition-all active:scale-[0.9] border border-danger/10 shadow-sm"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                {/* Native Ad Placement: Show after 1st record, then every 5th */}
                {!isAdFree && idx % 5 === 0 && (
                  <div className="pt-0.5">
                    <NativeAdCard />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>


      {/* person Delete Confirmation Sheet */}
      {showPersonDeleteConfirm && createPortal(
        <div className="fixed inset-0 z-[10003] flex items-end justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setShowPersonDeleteConfirm(false)}>
          <div
            className="w-full max-w-md bg-card rounded-[3rem] p-7 pt-9 pb-10 space-y-6 animate-in slide-in-from-bottom-10 duration-300 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={28} className="text-destructive" />
              </div>
              <h2 className="text-xl font-bold tracking-tight">Delete Contact?</h2>
              <p className="text-sm text-muted-foreground px-4">
                This will permanently remove <span className="font-semibold text-foreground">{person.name}</span> index from your shared contacts.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <button
                onClick={() => setShowPersonDeleteConfirm(false)}
                className="w-full h-14 rounded-2xl bg-secondary/50 text-secondary-foreground font-bold hover:bg-secondary transition-all active:scale-[0.97]"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeletePerson}
                className="w-full h-14 rounded-2xl bg-destructive text-destructive-foreground font-black shadow-xl shadow-destructive/20 hover:brightness-110 transition-all active:scale-[0.97]"
              >
                Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Sheet */}
      {deletingId && createPortal(
        <div className="fixed inset-0 z-[10002] flex items-end justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setDeletingId(null)}>
          <div
            className="w-full max-w-md bg-card rounded-[3rem] p-7 pt-9 pb-10 space-y-6 animate-in slide-in-from-bottom-10 border border-border/10 duration-300 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={28} className="text-destructive" />
              </div>
              <h2 className="text-xl font-bold tracking-tight">Delete Transaction?</h2>
              <p className="text-sm text-muted-foreground px-4">
                Are you sure you want to remove this? This action cannot be undone.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <button
                onClick={() => setDeletingId(null)}
                className="w-full h-14 rounded-2xl bg-secondary/50 text-secondary-foreground font-bold hover:bg-secondary transition-all active:scale-[0.97]"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="w-full h-14 rounded-2xl bg-destructive text-white font-bold shadow-xl shadow-destructive/20 active:scale-[0.97]"
              >
                Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {/* Settle Confirmation Sheet */}
      {showSettleConfirm && person && createPortal(
        <div className="fixed inset-0 z-[10003] flex items-end justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setShowSettleConfirm(false)}>
          <div
            className="w-full max-w-md bg-card rounded-[3rem] p-7 pt-9 pb-10 space-y-6 animate-in slide-in-from-bottom-10 border border-border/10 duration-300 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={28} className="text-primary" />
              </div>
              <h2 className="text-xl font-bold tracking-tight">Settle Balance?</h2>
              <p className="text-sm text-muted-foreground px-4">
                Confirm that you've settled all outstanding amounts with <span className="font-semibold text-foreground">{person.name}</span>.
              </p>
              <div className="mt-4 p-4 bg-secondary/15 rounded-2xl border border-border/5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Direct Adjustment</p>
                <div className="text-2xl font-black">
                  <MoneyDisplay amount={person.netBalance} showSign={true} />
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              {/* Payment Mode Toggle */}
              <div className="flex p-1 bg-secondary/10 rounded-2xl border border-border/5">
                <button
                  onClick={() => setPaymentMode('UPI')}
                  className={cn(
                    "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    paymentMode === 'UPI' ? "bg-background text-primary shadow-sm" : "text-muted-foreground/40"
                  )}
                >
                  UPI
                </button>
                <button
                  onClick={() => setPaymentMode('CASH')}
                  className={cn(
                    "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    paymentMode === 'CASH' ? "bg-background text-primary shadow-sm" : "text-muted-foreground/40"
                  )}
                >
                  CASH
                </button>
              </div>

              {/* Date Picker */}
              <div className="relative">
                <input
                  type="date"
                  value={settleDate}
                  onChange={(e) => setSettleDate(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl bg-secondary/10 border border-border/10 outline-none font-bold text-xs text-muted-foreground transition-all uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setShowSettleConfirm(false)}
                  className="w-full h-14 rounded-2xl bg-secondary/50 text-secondary-foreground font-bold hover:bg-secondary transition-all active:scale-[0.97]"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSettle}
                  className="w-full h-14 rounded-2xl bg-primary text-white font-bold shadow-xl shadow-primary/20 active:scale-[0.97]"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
      {/* Rollback Confirmation Sheet */}
      {showRollbackConfirm && person && createPortal(
        <div className="fixed inset-0 z-[10003] flex items-end justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setShowRollbackConfirm(false)}>
          <div
            className="w-full max-w-md bg-card rounded-[3rem] p-7 pt-9 pb-10 space-y-6 animate-in slide-in-from-bottom-10 border border-border/10 duration-300 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-secondary/20 flex items-center justify-center mx-auto mb-4">
                <TrendingDown size={28} className="text-muted-foreground" />
              </div>
              <h2 className="text-xl font-bold tracking-tight">Undo Settlement?</h2>
              <p className="text-sm text-muted-foreground px-4">
                Are you sure you want to rollback all settled transactions for <span className="font-semibold text-foreground">{person.name}</span>? This will restore their previous balance.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <button
                onClick={() => setShowRollbackConfirm(false)}
                className="w-full h-14 rounded-2xl bg-secondary/50 text-secondary-foreground font-bold hover:bg-secondary transition-all active:scale-[0.97]"
              >
                Keep Settled
              </button>
              <button
                onClick={confirmRollback}
                className="w-full h-14 rounded-2xl bg-foreground text-background font-black shadow-xl shadow-foreground/10 active:scale-[0.97]"
              >
                Undo Last
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {/* Floating Add Button */}
      <button
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-16 right-6 w-14 h-14 rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/30 flex items-center justify-center active:scale-90 transition-all z-40 border border-primary-glow/20"
      >
        <Plus size={28} strokeWidth={3} />
      </button>

      <AddSharedExpenseModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        initialPersonName={person?.name}
        onAdd={() => {
          setShowAddModal(false);
          refreshPersonData();
        }}
      />

      {/* Transaction Detail Sheet */}
      {viewingTransaction && createPortal(
        <div className="fixed inset-0 z-[10001] flex items-end justify-center pointer-events-auto" onClick={() => { setViewingTransaction(null); setIsEditingReason(false); }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
          <div
            className="w-full max-w-md bg-card rounded-[3rem] p-6 pb-12 space-y-5 animate-in slide-in-from-bottom-full border border-border/10 duration-500 shadow-2xl relative overflow-hidden mb-4 mx-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-muted/20 rounded-full mt-3" />

            <div className="flex items-center justify-between">
              <button
                onClick={() => { setViewingTransaction(null); setIsEditingReason(false); }}
                className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center active:scale-90 transition-all border border-border/5"
              >
                <X size={16} className="text-muted-foreground" />
              </button>
              <div className="flex items-center gap-2">
                {(viewingTransaction.createdByMe !== false && !viewingTransaction.isIncoming) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const id = viewingTransaction.id;
                      handleDeleteTrigger(id);
                      setTimeout(() => setViewingTransaction(null), 100);
                    }}
                    className="w-9 h-9 rounded-full bg-destructive/10 flex items-center justify-center active:scale-90 transition-all border border-destructive/10 group"
                  >
                    <Trash2 size={16} className="text-destructive group-hover:scale-110 transition-transform" />
                  </button>
                )}
              </div>
            </div>

            <div className="text-center space-y-1 py-1">
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/30">Contribution</p>
              <MoneyDisplay
                amount={viewingTransaction.amount}
                size="xl"
                className={cn(
                  "font-black text-5xl tracking-tighter block",
                  viewingTransaction.paidBy === 'me' ? "text-red-500" : "text-green-500"
                )}
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Collaboration Modal */}
      {showCollabModal && createPortal(
        <div className="fixed inset-0 z-[10003] flex items-end justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300" onClick={() => { setShowCollabModal(false); setIsEditingEmail(false); }}>
          <div
            className="w-full max-w-md bg-card rounded-[3rem] p-7 pt-9 pb-12 space-y-6 animate-in slide-in-from-bottom-10 border border-border/10 duration-500 shadow-2xl relative overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-muted/20 rounded-full mt-3" />

            <div className="text-center space-y-4">
              <div className="w-20 h-20 rounded-[2.5rem] bg-primary/10 flex items-center justify-center mx-auto mb-2 border border-primary/20">
                <Users size={36} className="text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight uppercase">Collaboration</h2>
                <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] mt-1">Real-time Peer Sync</p>
              </div>
            </div>

            <div className="space-y-4">
              {isEditingEmail ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="p-4 bg-secondary/30 rounded-2xl border border-border/5">
                    <p className="text-[10px] font-black uppercase text-muted-foreground/60 mb-2 px-1">Peer's Gmail Address</p>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. john@gmail.com"
                      className="w-full h-12 bg-background rounded-xl px-4 text-sm font-bold border border-border/10 focus:border-primary/50 transition-all outline-none"
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setIsEditingEmail(false)}
                      className="flex-1 h-14 rounded-2xl bg-secondary text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => {
                        handleSaveEmail();
                        setShowCollabModal(false);
                      }}
                      className="flex-1 h-14 rounded-2xl bg-primary text-white text-[11px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 active:scale-95 transition-all"
                    >
                      Link Account
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  {linkedEmail ? (
                    <div className="p-5 bg-success/5 rounded-3xl border border-success/10 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-success/20 flex items-center justify-center">
                          <CheckCircle2 size={20} className="text-success" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-foreground">Sync Active</p>
                          <p className="text-[10px] text-muted-foreground truncate">{linkedEmail}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => {
                            syncExpensesWithPerson(person.name);
                            toast.success("Sync triggered!");
                          }}
                          className="h-11 rounded-xl bg-background border border-success/20 text-success text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                          <RefreshCw size={14} />
                          Force Sync
                        </button>
                        <button
                          onClick={() => setIsEditingEmail(true)}
                          className="h-11 rounded-xl bg-background border border-border/10 text-muted-foreground text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                          <Pencil size={14} />
                          Edit Link
                        </button>
                      </div>
                    </div>
                  ) : !getAccountProfile().email ? (
                    <div className="p-6 bg-orange-500/5 rounded-3xl border border-orange-500/10 space-y-4">
                      <div className="flex items-center gap-3 text-orange-500">
                        <AlertCircle size={20} />
                        <p className="text-[11px] font-black uppercase tracking-wider leading-tight">Identity Required</p>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                        To sync expenses with <span className="text-foreground font-bold">{person.name}</span>, you first need to sign in with your own Google account.
                      </p>
                      <button 
                         onClick={() => { setShowCollabModal(false); navigate('/', { state: { tabId: 'settings' } }); }}
                         className="w-full h-12 rounded-2xl bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
                      >
                         Go to Account Settings
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-xs text-muted-foreground leading-relaxed text-center px-4">
                        Add <span className="text-foreground font-bold">{person.name}'s</span> Gmail address to automatically synchronize your shared expenses across both your devices.
                      </p>
                      <button
                        onClick={() => setIsEditingEmail(true)}
                        className="w-full h-14 rounded-2xl bg-primary text-white text-[11px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                      >
                        <Plus size={18} strokeWidth={3} />
                        Setup Collaboration
                      </button>
                    </div>
                  )}
                  
                  <button
                    onClick={() => setShowCollabModal(false)}
                    className="w-full h-14 rounded-2xl bg-secondary/50 text-muted-foreground text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
