
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Trash2, History, TrendingUp, TrendingDown, DollarSign, BarChart3 } from 'lucide-react';
import { MoneyDisplay } from '@/components/MoneyDisplay';
import { ExpenseChart } from '@/components/ExpenseChart';
import { getPersonBalances, deleteSharedExpense, settleExpenseWithPerson, type PersonBalance } from '@/lib/storage';
import { BottomNavigation } from '@/components/BottomNavigation';

export default function PersonDetailsPage() {
  const { personName } = useParams<{ personName: string }>();
  const navigate = useNavigate();
  const [person, setPerson] = useState<PersonBalance | null>(null);

  useEffect(() => {
    if (personName) {
      const personBalances = getPersonBalances();
      const foundPerson = personBalances.find(p => p.name === decodeURIComponent(personName));
      setPerson(foundPerson || null);
    }
  }, [personName]);

  const handleSettle = () => {
    if (person) {
      settleExpenseWithPerson(person.name);
      // Refresh person data
      const updatedBalances = getPersonBalances();
      const updatedPerson = updatedBalances.find(p => p.name === person.name);
      setPerson(updatedPerson || null);
    }
  };

  const handleDeleteTransaction = (transactionId: string) => {
    deleteSharedExpense(transactionId);
    if (person) {
      // Refresh person data
      const updatedBalances = getPersonBalances();
      const updatedPerson = updatedBalances.find(p => p.name === person.name);
      setPerson(updatedPerson || null);
    }
  };

  if (!person) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Person not found</p>
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
        <div className="flex items-center justify-between px-4 py-3.5">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: 'hsl(var(--secondary))', transition: 'transform 0.15s ease' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.transform = 'scale(1.06)')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.transform = 'scale(1)')}
          >
            <ArrowLeft size={18} />
          </button>
          <div className="text-center">
            <h1 className="text-lg font-bold">{person.name}</h1>
            <p className="text-xs text-muted-foreground">
              {person.transactions.length} transaction{person.transactions.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="w-10" />
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
            borderRadius: '1.25rem',
          }}
        >
          <div className="absolute top-4 right-4 opacity-[0.07]">
            <DollarSign size={52} className="text-primary" />
          </div>
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

          {person.netBalance !== 0 && (
            <button
              onClick={handleSettle}
              className="w-full flex items-center justify-center gap-2 mt-2 py-3 rounded-2xl font-semibold text-sm"
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
            <ExpenseChart data={flowData} type="pie" height={190} />
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
          <div className="space-y-2">
            {sortedTransactions.map((transaction) => (
              <div key={transaction.id} className="ios-card-modern px-4 py-3.5 group">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {transaction.reason || 'Shared expense'}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>{new Date(transaction.date).toLocaleDateString()}</span>
                      <span className="opacity-40">•</span>
                      <span>{transaction.paidBy === 'me' ? 'You paid' : `${person.name} paid`}</span>
                      {transaction.settled && (
                        <>
                          <span className="opacity-40">•</span>
                          <span className="text-success font-semibold">Settled</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <MoneyDisplay amount={transaction.amount} size="sm" />
                    <button
                      onClick={() => handleDeleteTransaction(transaction.id)}
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
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation activeTab="shared" onTabChange={(tab) => {
        if (tab === 'home') navigate('/');
        else if (tab === 'personal') navigate('/');
        else if (tab === 'shared') navigate('/');
        else if (tab === 'settings') navigate('/');
      }} />
    </div>
  );
}
