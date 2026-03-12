
import { useState, useMemo } from 'react';
import { Plus, Filter, Search, Trash2, TrendingUp, PieChart, Calendar, BarChart3 } from 'lucide-react';
import { MoneyDisplay } from '@/components/MoneyDisplay';
import { ExpenseChart } from '@/components/ExpenseChart';
import { getPersonalExpenses, deletePersonalExpense, EXPENSE_CATEGORIES, type PersonalExpense } from '@/lib/storage';
import { AddPersonalExpenseModal } from '@/components/modals/AddPersonalExpenseModal';

const CATEGORY_EMOJIS: Record<string, string> = {
  Food: '🍕', Transport: '🚗', Shopping: '🛍️', Entertainment: '🎬',
  Health: '💊', Bills: '📄', Education: '📚', Travel: '✈️',
  Rent: '🏠', Other: '📦',
};

export function PersonalTab() {
  const [expenses, setExpenses] = useState<PersonalExpense[]>(getPersonalExpenses());
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
      const matchesCategory = selectedCategory === 'All' || expense.category === selectedCategory;
      const matchesSearch = expense.reason.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, selectedCategory, searchTerm]);

  const { totalAmount, chartData } = useMemo(() => {
    const total = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);

    const categoryTotals = EXPENSE_CATEGORIES.map(category => {
      const amount = filteredExpenses
        .filter(expense => expense.category === category)
        .reduce((sum, expense) => sum + expense.amount, 0);
      return { name: category, value: amount };
    }).filter(item => item.value > 0);

    return { totalAmount: total, chartData: categoryTotals };
  }, [filteredExpenses]);

  const handleAddExpense = () => {
    setExpenses(getPersonalExpenses());
    setShowAddModal(false);
  };

  const handleDeleteExpense = (id: string) => {
    deletePersonalExpense(id);
    setExpenses(getPersonalExpenses());
  };

  const groupedExpenses = useMemo(() => {
    const groups: { [key: string]: PersonalExpense[] } = {};

    filteredExpenses.forEach(expense => {
      const date = new Date(expense.date);
      const monthKey = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long'
      });

      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push(expense);
    });

    return groups;
  }, [filteredExpenses]);

  return (
    <div className="p-4 space-y-4" style={{ paddingBottom: showAddModal ? '0' : '120px' }}>
      {/* Header */}
      <div className="pt-4 pb-1">
        <h1 className="text-2xl font-bold">Personal</h1>
        <p className="text-sm text-muted-foreground">Track your expenses</p>
      </div>

      {/* Total Amount Card */}
      <div className="p-5 text-center relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, hsl(var(--primary) / 0.1) 0%, hsl(var(--card) / 0.95) 50%)',
          border: '1px solid hsl(var(--primary) / 0.12)',
          borderRadius: '1.75rem',
          boxShadow: '0 4px 20px -8px hsl(var(--primary) / 0.15)',
        }}>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2" style={{ letterSpacing: '0.08em' }}>
          Total {selectedCategory !== 'All' ? selectedCategory : 'Expenses'}
        </p>
        <MoneyDisplay amount={totalAmount} size="lg" />
        <p className="text-xs text-muted-foreground mt-1.5">{filteredExpenses.length} expense{filteredExpenses.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Category Chart */}
      {chartData.length > 0 && (
        <div className="ios-card-modern p-5 space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-400/15 rounded-xl flex items-center justify-center">
              <BarChart3 size={15} className="text-purple-400" />
            </div>
            Category Breakdown
          </h3>
          <ExpenseChart data={chartData} type="bar" height={200} />
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search expenses..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-liquid pl-11 h-11 rounded-2xl text-sm"
        />
      </div>

      {/* Category Filter - emoji chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <button
          onClick={() => setSelectedCategory('All')}
          className="px-3.5 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap border flex items-center gap-1.5 flex-shrink-0 transition-all duration-200"
          style={{
            background: selectedCategory === 'All' ? 'hsl(var(--primary))' : 'hsl(var(--secondary) / 0.5)',
            color: selectedCategory === 'All' ? 'hsl(var(--primary-foreground))' : 'hsl(var(--muted-foreground))',
            borderColor: selectedCategory === 'All' ? 'hsl(var(--primary) / 0.5)' : 'hsl(var(--border) / 0.2)',
            boxShadow: selectedCategory === 'All' ? '0 4px 12px -4px hsl(var(--primary) / 0.3)' : 'none',
          }}
        >
          🏷️ All
        </button>
        {EXPENSE_CATEGORIES.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className="px-3.5 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap border flex items-center gap-1.5 flex-shrink-0 transition-all duration-200"
            style={{
              background: selectedCategory === category ? 'hsl(var(--primary))' : 'hsl(var(--secondary) / 0.5)',
              color: selectedCategory === category ? 'hsl(var(--primary-foreground))' : 'hsl(var(--muted-foreground))',
              borderColor: selectedCategory === category ? 'hsl(var(--primary) / 0.5)' : 'hsl(var(--border) / 0.2)',
              boxShadow: selectedCategory === category ? '0 4px 12px -4px hsl(var(--primary) / 0.3)' : 'none',
            }}
          >
            {CATEGORY_EMOJIS[category] || '📦'} {category}
          </button>
        ))}
      </div>

      {/* Expenses List */}
      {Object.keys(groupedExpenses).length === 0 ? (
        <div className="ios-card-modern p-10 text-center">
          <div className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'hsl(var(--muted) / 0.5)' }}>
            <Calendar size={28} className="text-muted-foreground" />
          </div>
          <p className="text-foreground font-semibold">No expenses found</p>
          <p className="text-sm text-muted-foreground mt-1">Tap + to add your first expense</p>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(groupedExpenses).map(([month, monthExpenses]) => (
            <div key={month} className="space-y-2">
              <h3 className="font-semibold text-muted-foreground text-xs uppercase tracking-widest px-1" style={{ letterSpacing: '0.08em' }}>
                {month}
              </h3>
              <div className="space-y-2">
                {monthExpenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="ios-card-modern px-4 py-3.5 group"
                  >
                    <div className="flex items-center gap-3">
                      {/* Category emoji avatar */}
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 text-lg"
                        style={{
                          background: 'hsl(var(--secondary) / 0.6)',
                          border: '1px solid hsl(var(--border) / 0.15)',
                        }}>
                        {CATEGORY_EMOJIS[expense.category] || '📦'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">{expense.reason}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-muted-foreground font-medium">{expense.category}</span>
                          <span className="text-muted-foreground opacity-40 text-[10px]">·</span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(expense.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <MoneyDisplay amount={expense.amount} size="sm" />
                        <button
                          onClick={() => handleDeleteExpense(expense.id)}
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
            </div>
          ))}
        </div>
      )}

      {/* Floating Action Button */}
      {!showAddModal && (
        <div className="fab-container">
          <button
            onClick={() => setShowAddModal(true)}
            className="fab-button"
          >
            <Plus size={22} />
          </button>
        </div>
      )}

      {/* Add Expense Modal */}
      <AddPersonalExpenseModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddExpense}
      />
    </div>
  );
}
