
import { Plus, TrendingUp, TrendingDown, Users, DollarSign, Activity, Target, PieChart, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { MoneyDisplay } from '@/components/MoneyDisplay';
import { ExpenseChart } from '@/components/ExpenseChart';
import { getPersonalExpenses, getPersonBalances, getSharedExpenses, EXPENSE_CATEGORIES, getCurrency } from '@/lib/storage';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

interface HomeTabProps {
  onAddPersonal: () => void;
  onAddShared: () => void;
}

export function HomeTab({ onAddPersonal, onAddShared }: HomeTabProps) {
  const navigate = useNavigate();
  const personalExpenses = getPersonalExpenses();
  const personBalances = getPersonBalances();
  const sharedExpenses = getSharedExpenses();
  const currency = getCurrency();

  const stats = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const thisMonthPersonal = personalExpenses
      .filter(expense => expense.date.startsWith(currentMonth))
      .reduce((sum, expense) => sum + expense.amount, 0);

    const netSharedBalance = personBalances.reduce((sum, person) => sum + person.netBalance, 0);

    const categoryData = EXPENSE_CATEGORIES.map(category => {
      const amount = personalExpenses
        .filter(expense => expense.category === category && expense.date.startsWith(currentMonth))
        .reduce((sum, expense) => sum + expense.amount, 0);
      return { name: category, value: amount };
    }).filter(item => item.value > 0);

    const topPeople = personBalances
      .filter(person => Math.abs(person.netBalance) > 0)
      .sort((a, b) => Math.abs(b.netBalance) - Math.abs(a.netBalance))
      .slice(0, 3);

    const owedToYou = personBalances
      .filter(p => p.netBalance > 0)
      .reduce((sum, p) => sum + p.netBalance, 0);
    const youOwe = personBalances
      .filter(p => p.netBalance < 0)
      .reduce((sum, p) => sum + Math.abs(p.netBalance), 0);

    return {
      thisMonthPersonal,
      netSharedBalance,
      topPeople,
      totalTransactions: personalExpenses.length + sharedExpenses.length,
      categoryData,
      owedToYou,
      youOwe,
      activePeople: personBalances.filter(p => p.netBalance !== 0).length,
    };
  }, [personalExpenses, personBalances, sharedExpenses]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  return (
    <div className="p-4 pb-28 space-y-5">
      {/* Header */}
      <div className="pt-4 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium">{greeting} 👋</p>
            <h1 className="text-2xl font-bold mt-0.5"
              style={{
                background: 'linear-gradient(135deg, hsl(var(--foreground)), hsl(var(--muted-foreground)))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >SplitMate</h1>
          </div>
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-glow)))',
              boxShadow: '0 4px 16px -4px hsl(var(--primary) / 0.5)',
            }}
          >
            <Wallet size={18} color="white" />
          </div>
        </div>
      </div>

      {/* Net Balance Card - hero */}
      <div
        className="p-6 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, hsl(var(--primary) / 0.15) 0%, hsl(var(--card) / 0.95) 50%, hsl(var(--accent) / 0.1) 100%)',
          border: '1px solid hsl(var(--primary) / 0.15)',
          borderRadius: '1.75rem',
          boxShadow: '0 8px 32px -8px hsl(var(--primary) / 0.2), inset 0 1px 0 hsl(0 0% 100% / 0.06)',
        }}
      >
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-[0.06]"
          style={{ background: 'radial-gradient(circle, hsl(var(--primary)), transparent)' }} />
        
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3" style={{ letterSpacing: '0.08em' }}>
          Net Balance
        </p>
        <MoneyDisplay
          amount={stats.netSharedBalance}
          size="xl"
          showSign={true}
          className="block"
        />
        <p className="text-xs text-muted-foreground mt-2">
          {stats.netSharedBalance > 0 ? "You are owed money"
            : stats.netSharedBalance < 0 ? "You owe money"
            : "All settled up! 🎉"}
        </p>

        {/* Owed / You owe breakdown */}
        {(stats.owedToYou > 0 || stats.youOwe > 0) && (
          <div className="flex gap-3 mt-4 pt-4" style={{ borderTop: '1px solid hsl(var(--border) / 0.15)' }}>
            <div className="flex items-center gap-2 flex-1">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'hsl(var(--success) / 0.15)' }}>
                <ArrowDownRight size={13} className="text-success" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Owed to you</p>
                <p className="text-sm font-bold text-success">{currency.symbol}{stats.owedToYou.toLocaleString(currency.locale)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-1">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'hsl(var(--danger) / 0.15)' }}>
                <ArrowUpRight size={13} className="text-danger" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">You owe</p>
                <p className="text-sm font-bold text-danger">{currency.symbol}{stats.youOwe.toLocaleString(currency.locale)}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Add Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onAddPersonal}
          className="group h-[68px] flex items-center gap-3 px-4 rounded-2xl relative overflow-hidden font-semibold text-sm"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-glow)))',
            color: 'hsl(var(--primary-foreground))',
            boxShadow: '0 6px 20px -6px hsl(var(--primary) / 0.45), inset 0 1px 0 hsl(0 0% 100% / 0.15)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          }}
        >
          <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
            <Plus size={18} />
          </div>
          <span className="text-left leading-tight">Add<br />Personal</span>
        </button>

        <button
          onClick={onAddShared}
          className="group h-[68px] flex items-center gap-3 px-4 rounded-2xl font-semibold text-sm"
          style={{
            background: 'hsl(var(--card) / 0.95)',
            color: 'hsl(var(--foreground))',
            border: '1px solid hsl(var(--border) / 0.4)',
            boxShadow: '0 2px 12px -4px hsl(var(--glass-shadow) / 0.3)',
            transition: 'transform 0.2s ease, border-color 0.2s ease',
          }}
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'hsl(var(--primary) / 0.12)' }}>
            <Users size={16} className="text-primary" />
          </div>
          <span className="text-left leading-tight">Add<br />Shared</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="ios-card-modern p-4 text-center space-y-1">
          <div className="w-8 h-8 mx-auto rounded-xl flex items-center justify-center" style={{ background: 'hsl(211 100% 58% / 0.12)' }}>
            <TrendingUp size={14} className="text-blue-400" />
          </div>
          <p className="text-lg font-bold text-foreground">{currency.symbol}{stats.thisMonthPersonal.toLocaleString(currency.locale)}</p>
          <p className="text-[10px] text-muted-foreground">This Month</p>
        </div>
        <div className="ios-card-modern p-4 text-center space-y-1">
          <div className="w-8 h-8 mx-auto rounded-xl flex items-center justify-center" style={{ background: 'hsl(270 50% 60% / 0.12)' }}>
            <Activity size={14} className="text-purple-400" />
          </div>
          <p className="text-lg font-bold text-foreground">{stats.totalTransactions}</p>
          <p className="text-[10px] text-muted-foreground">Transactions</p>
        </div>
        <div className="ios-card-modern p-4 text-center space-y-1">
          <div className="w-8 h-8 mx-auto rounded-xl flex items-center justify-center" style={{ background: 'hsl(var(--warning) / 0.12)' }}>
            <Users size={14} className="text-warning" />
          </div>
          <p className="text-lg font-bold text-foreground">{stats.activePeople}</p>
          <p className="text-[10px] text-muted-foreground">Active</p>
        </div>
      </div>

      {/* Expense Distribution Chart */}
      {stats.categoryData.length > 0 && (
        <div className="ios-card-modern p-5 space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-400/15 rounded-xl flex items-center justify-center">
              <PieChart size={15} className="text-purple-400" />
            </div>
            Spending Breakdown
          </h3>
          <ExpenseChart data={stats.categoryData} type="pie" height={200} />
        </div>
      )}

      {/* Top People */}
      {stats.topPeople.length > 0 && (
        <div className="ios-card-modern p-5 space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-400/15 rounded-xl flex items-center justify-center">
              <TrendingDown size={15} className="text-orange-400" />
            </div>
            Top Balances
          </h3>
          <div className="space-y-2">
            {stats.topPeople.map((person, index) => (
              <button
                key={person.name}
                onClick={() => navigate(`/person/${encodeURIComponent(person.name)}`)}
                className="w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-left transition-all duration-150 active:scale-[0.98]"
                style={{
                  background: 'hsl(var(--secondary) / 0.4)',
                  border: '1px solid hsl(var(--border) / 0.2)',
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold"
                    style={{
                      background: person.netBalance > 0 ? 'hsl(var(--success) / 0.15)' : 'hsl(var(--danger) / 0.15)',
                      color: person.netBalance > 0 ? 'hsl(var(--success))' : 'hsl(var(--danger))',
                    }}>
                    {person.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-sm">{person.name}</span>
                </div>
                <MoneyDisplay amount={person.netBalance} size="sm" showSign={true} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
