
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, User, CheckCircle2, Trash2, Users, TrendingUp, DollarSign, BarChart3, ArrowDownRight, ArrowUpRight, Search, X } from 'lucide-react';
import { MoneyDisplay } from '@/components/MoneyDisplay';
import { ExpenseChart } from '@/components/ExpenseChart';
import { getPersonBalances, getSharedExpenses, deleteSharedExpense, settleExpenseWithPerson, getCurrency, type PersonBalance } from '@/lib/storage';
import { AddSharedExpenseModal } from '@/components/modals/AddSharedExpenseModal';

export function SharedTab() {
  const [personBalances, setPersonBalances] = useState<PersonBalance[]>(getPersonBalances());
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const navigate = useNavigate();
  const currency = getCurrency();
  const isSearching = searchQuery.trim().length > 0;

  // Sort people: most recent transaction first, then filter by search
  const sortedBalances = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return [...personBalances]
      .filter(p => !q || p.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const latestA = a.transactions.reduce((latest, t) => {
          const d = new Date(t.createdAt).getTime();
          return d > latest ? d : latest;
        }, 0);
        const latestB = b.transactions.reduce((latest, t) => {
          const d = new Date(t.createdAt).getTime();
          return d > latest ? d : latest;
        }, 0);
        return latestB - latestA;
      });
  }, [personBalances, searchQuery]);

  const { netBalance, balanceData, owedToYou, youOwe } = useMemo(() => {
    const net = personBalances.reduce((sum, person) => sum + person.netBalance, 0);

    const positiveBalances = personBalances.filter(p => p.netBalance > 0);
    const negativeBalances = personBalances.filter(p => p.netBalance < 0);
    const owed = positiveBalances.reduce((sum, p) => sum + p.netBalance, 0);
    const owe = Math.abs(negativeBalances.reduce((sum, p) => sum + p.netBalance, 0));

    const chartData = [
      { name: 'Owed to You', value: Math.abs(positiveBalances.reduce((sum, p) => sum + p.netBalance, 0)), color: 'hsl(149, 88%, 52%)' },
      { name: 'You Owe', value: Math.abs(negativeBalances.reduce((sum, p) => sum + p.netBalance, 0)), color: 'hsl(0, 85%, 65%)' }
    ].filter(item => item.value > 0);

    return { netBalance: net, balanceData: chartData, owedToYou: owed, youOwe: owe };
  }, [personBalances]);

  const handleAddExpense = () => {
    setPersonBalances(getPersonBalances());
    setShowAddModal(false);
  };

  const handleSettlePerson = (personName: string) => {
    settleExpenseWithPerson(personName);
    setPersonBalances(getPersonBalances());
  };

  const handleDeleteTransaction = (transactionId: string) => {
    deleteSharedExpense(transactionId);
    setPersonBalances(getPersonBalances());
  };

  const handlePersonClick = (person: PersonBalance) => {
    navigate(`/person/${encodeURIComponent(person.name)}`);
  };

  return (
    <div className="p-4 pb-28 space-y-5">
      {/* Header */}
      <div className="pt-4 pb-1">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Shared</h1>
            <p className="text-sm text-muted-foreground">Split expenses with others</p>
          </div>
          {personBalances.length > 0 && (
            <button
              onClick={() => { setShowSearch(!showSearch); if (showSearch) setSearchQuery(''); }}
              className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-200"
              style={{
                background: showSearch ? 'hsl(var(--primary) / 0.15)' : 'hsl(var(--secondary))',
                border: `1px solid ${showSearch ? 'hsl(var(--primary) / 0.3)' : 'hsl(var(--border) / 0.4)'}`,
              }}
            >
              {showSearch ? <X size={16} className="text-primary" /> : <Search size={16} className="text-muted-foreground" />}
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      {showSearch && (
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            autoFocus
            placeholder="Search people..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 h-11 rounded-2xl text-sm bg-card/50 border border-border/30 outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15 transition-all"
          />
        </div>
      )}

      {/* Balance Overview Card */}
      {!isSearching && (
      <div
        className="p-5 relative overflow-hidden"
        style={{
          background: netBalance >= 0
            ? 'linear-gradient(135deg, hsl(var(--success) / 0.1) 0%, hsl(var(--card) / 0.95) 60%)'
            : 'linear-gradient(135deg, hsl(var(--danger) / 0.1) 0%, hsl(var(--card) / 0.95) 60%)',
          border: `1px solid ${netBalance >= 0 ? 'hsl(var(--success) / 0.15)' : 'hsl(var(--danger) / 0.15)'}`,
          borderRadius: '1.75rem',
          boxShadow: `0 8px 28px -8px ${netBalance >= 0 ? 'hsl(var(--success) / 0.15)' : 'hsl(var(--danger) / 0.15)'}`,
        }}
      >
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2" style={{ letterSpacing: '0.08em' }}>
          Overall Balance
        </p>
        <MoneyDisplay amount={netBalance} size="lg" showSign={true} />
        <p className="text-xs text-muted-foreground mt-1.5">
          {netBalance > 0 ? "You are owed money overall" : netBalance < 0 ? "You owe money overall" : "All balanced! 🎉"}
        </p>

        {/* Mini breakdown */}
        <div className="flex gap-3 mt-4 pt-3" style={{ borderTop: '1px solid hsl(var(--border) / 0.12)' }}>
          <div className="flex items-center gap-2 flex-1 px-3 py-2 rounded-xl" style={{ background: 'hsl(var(--success) / 0.08)' }}>
            <ArrowDownRight size={13} className="text-success" />
            <div>
              <p className="text-[10px] text-muted-foreground">Incoming</p>
              <p className="text-xs font-bold text-success">{currency.symbol}{owedToYou.toLocaleString(currency.locale)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-1 px-3 py-2 rounded-xl" style={{ background: 'hsl(var(--danger) / 0.08)' }}>
            <ArrowUpRight size={13} className="text-danger" />
            <div>
              <p className="text-[10px] text-muted-foreground">Outgoing</p>
              <p className="text-xs font-bold text-danger">{currency.symbol}{youOwe.toLocaleString(currency.locale)}</p>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Balance Distribution Chart */}
      {!isSearching && balanceData.length > 0 && (
        <div className="ios-card-modern p-5 space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <div className="w-8 h-8 bg-success/15 rounded-xl flex items-center justify-center">
              <BarChart3 size={15} className="text-success" />
            </div>
            Balance Overview
          </h3>
          <ExpenseChart data={balanceData} type="pie" height={200} />
        </div>
      )}

      {/* People List */}
      {sortedBalances.length === 0 ? (
        <div className="ios-card-modern p-10 text-center">
          <div className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'hsl(var(--muted) / 0.5)' }}>
            <Users size={28} className="text-muted-foreground" />
          </div>
          <p className="text-foreground font-semibold">No shared expenses yet</p>
          <p className="text-sm text-muted-foreground mt-1">Tap + to add your first shared expense</p>
        </div>
      ) : (
        <div className="space-y-3">
          <h3 className="font-semibold text-muted-foreground text-xs uppercase tracking-widest px-1" style={{ letterSpacing: '0.08em' }}>
            People ({sortedBalances.length})
          </h3>

          {sortedBalances.map((person) => (
            <div
              key={person.name}
              className="ios-card-modern p-4"
            >
              <div className="flex items-center justify-between">
                <button
                  onClick={() => handlePersonClick(person)}
                  className="flex items-center gap-3 flex-1 text-left group"
                >
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 text-sm font-bold"
                    style={{
                      background: person.netBalance > 0
                        ? 'hsl(var(--success) / 0.12)' : person.netBalance < 0
                        ? 'hsl(var(--danger) / 0.12)' : 'hsl(var(--muted) / 0.3)',
                      color: person.netBalance > 0
                        ? 'hsl(var(--success))' : person.netBalance < 0
                        ? 'hsl(var(--danger))' : 'hsl(var(--muted-foreground))',
                      border: `1px solid ${person.netBalance > 0
                        ? 'hsl(var(--success) / 0.2)' : person.netBalance < 0
                        ? 'hsl(var(--danger) / 0.2)' : 'hsl(var(--border) / 0.3)'}`,
                    }}
                  >
                    {person.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate group-hover:text-primary" style={{ transition: 'color 0.15s ease' }}>
                      {person.name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span>{person.transactions.length} txn{person.transactions.length !== 1 ? 's' : ''}</span>
                      {person.netBalance === 0 && (
                        <span className="text-success font-semibold flex items-center gap-0.5">
                          <CheckCircle2 size={10} /> Settled
                        </span>
                      )}
                    </div>
                  </div>
                </button>

                <div className="flex items-center gap-2">
                  <MoneyDisplay amount={person.netBalance} size="sm" showSign={true} />
                  {person.netBalance !== 0 && (
                    <button
                      onClick={() => handleSettlePerson(person.name)}
                      className="text-[10px] px-2.5 py-1.5 rounded-xl font-bold transition-all duration-200"
                      style={{
                        background: 'hsl(var(--primary) / 0.12)',
                        color: 'hsl(var(--primary))',
                        border: '1px solid hsl(var(--primary) / 0.2)',
                      }}
                    >
                      Settle
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent Transactions */}
      {!isSearching && sortedBalances.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-muted-foreground text-xs uppercase tracking-widest px-1" style={{ letterSpacing: '0.08em' }}>
            Recent Transactions
          </h3>

          {getSharedExpenses()
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 5)
            .map((expense) => (
              <div
                key={expense.id}
                className="ios-card-modern px-4 py-3.5 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background: expense.paidBy === 'me' ? 'hsl(var(--success) / 0.1)' : 'hsl(var(--danger) / 0.1)',
                      }}>
                      {expense.paidBy === 'me'
                        ? <ArrowUpRight size={14} className="text-success" />
                        : <ArrowDownRight size={14} className="text-danger" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">{expense.reason || 'Shared expense'}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-muted-foreground">
                        <span className="font-medium">{expense.personName}</span>
                        <span className="opacity-40">·</span>
                        <span>{new Date(expense.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                        {expense.settled && (
                          <>
                            <span className="opacity-40">·</span>
                            <span className="text-success font-semibold">Settled</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <MoneyDisplay amount={expense.amount} size="sm" />
                      <p className="text-[9px] text-muted-foreground mt-0.5">
                        {expense.paidBy === 'me' ? 'You paid' : `${expense.personName} paid`}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteTransaction(expense.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-danger hover:bg-danger/10 rounded-xl"
                      style={{ transition: 'opacity 0.15s ease' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Floating Action Button */}
      <div className="fab-container">
        <button
          onClick={() => setShowAddModal(true)}
          className="fab-button"
        >
          <Plus size={22} />
        </button>
      </div>

      {/* Modals */}
      <AddSharedExpenseModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddExpense}
      />
    </div>
  );
}
