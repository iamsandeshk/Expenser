
import { useState, useRef, useEffect } from 'react';
import { User, Tag, Wallet, ChevronLeft } from 'lucide-react';
import { saveSharedExpense, generateId, getUniquePersonNames, EXPENSE_CATEGORIES, getCurrency, type SharedExpense } from '@/lib/storage';

interface AddSharedExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: () => void;
}

const CATEGORY_EMOJIS: Record<string, string> = {
  'Food & Dining': '🍕',
  'Transportation': '🚗',
  'Shopping': '🛍️',
  'Entertainment': '🎬',
  'Bills & Utilities': '📄',
  'Healthcare': '💊',
  'Education': '📚',
  'Travel': '✈️',
  'Groceries': '🛒',
  'Other': '📦',
};

export function AddSharedExpenseModal({ isOpen, onClose, onAdd }: AddSharedExpenseModalProps) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [category, setCategory] = useState('');
  const [personName, setPersonName] = useState('');
  const [paidBy, setPaidBy] = useState<'me' | 'them'>('me');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const existingNames = getUniquePersonNames();
  const currency = getCurrency();

  useEffect(() => {
    if (isOpen && amountRef.current) {
      setTimeout(() => amountRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !personName.trim()) return;

    setIsSubmitting(true);

    const expense: SharedExpense = {
      id: generateId(),
      amount: parseFloat(amount),
      reason: reason.trim() || category || 'Shared expense',
      paidBy: paidBy === 'me' ? 'me' : personName.trim(),
      forPerson: paidBy === 'me' ? personName.trim() : 'me',
      personName: personName.trim(),
      date,
      createdAt: new Date().toISOString(),
      settled: false,
    };

    saveSharedExpense(expense);

    setAmount('');
    setReason('');
    setCategory('');
    setPersonName('');
    setPaidBy('me');
    setDate(new Date().toISOString().split('T')[0]);
    setIsSubmitting(false);
    onAdd();
  };

  const summaryText = amount && personName
    ? paidBy === 'me'
      ? `${personName} owes you ${currency.symbol}${parseFloat(amount).toLocaleString(currency.locale)}`
      : `You owe ${personName} ${currency.symbol}${parseFloat(amount).toLocaleString(currency.locale)}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 flex-shrink-0"
        style={{ borderBottom: '1px solid hsl(var(--border) / 0.15)' }}>
        <button type="button" onClick={onClose} className="flex items-center gap-1 text-primary font-medium text-sm py-2 pr-3">
          <ChevronLeft size={20} /> Back
        </button>
        <h1 className="text-base font-bold absolute left-1/2 -translate-x-1/2">Split Expense</h1>
        <div className="w-16" />
      </div>

      {/* Scrollable content */}
      <form ref={formRef} onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
        <div className="px-5 py-6 space-y-6 max-w-lg mx-auto w-full">
          {/* Amount - hero */}
          <div className="text-center pt-2 pb-4">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-4">
              How much?
            </p>
            <div className="inline-flex items-baseline gap-1">
              <span className="text-3xl font-bold text-muted-foreground/50">{currency.symbol}</span>
              <input
                ref={amountRef}
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="text-5xl font-extrabold bg-transparent border-none outline-none text-center text-foreground w-48 placeholder:text-muted-foreground/20"
                style={{ caretColor: 'hsl(var(--primary))' }}
                step="0.01"
                min="0"
                required
              />
            </div>
            <div className="w-20 h-[3px] rounded-full mx-auto mt-3" style={{
              background: amount
                ? 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary-glow)))'
                : 'hsl(var(--border) / 0.5)',
              transition: 'background 0.3s ease',
            }} />
          </div>

          {/* Person */}
          <div className="space-y-2.5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest block">
              With whom?
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'hsl(var(--primary) / 0.1)' }}>
                <User size={16} className="text-primary" />
              </div>
              <input
                type="text"
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                placeholder="Enter name..."
                className="w-full pl-14 pr-4 rounded-2xl text-sm font-medium bg-card/50 outline-none transition-all"
                style={{ height: '52px', border: '1px solid hsl(var(--border) / 0.3)' }}
                list="existing-names-shared"
                required
              />
              <datalist id="existing-names-shared">
                {existingNames.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>
            {existingNames.length > 0 && !personName && (
              <div className="flex gap-2 overflow-x-auto pb-0.5 -mx-1 px-1">
                {existingNames.slice(0, 5).map((name) => (
                  <button key={name} type="button" onClick={() => setPersonName(name)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap flex-shrink-0"
                    style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border) / 0.3)' }}>
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Who paid */}
          <div className="space-y-2.5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest block">
              Who paid?
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(['me', 'them'] as const).map((who) => {
                const active = paidBy === who;
                return (
                  <button key={who} type="button" onClick={() => setPaidBy(who)}
                    className="relative h-14 rounded-2xl text-sm font-bold transition-all duration-200 overflow-hidden"
                    style={{
                      background: active
                        ? 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-glow)))'
                        : 'hsl(var(--card) / 0.7)',
                      color: active ? 'white' : 'hsl(var(--foreground))',
                      border: `1.5px solid ${active ? 'transparent' : 'hsl(var(--border) / 0.3)'}`,
                      boxShadow: active ? '0 6px 20px -6px hsl(var(--primary) / 0.45)' : 'none',
                    }}>
                    {who === 'me' ? '🙋  I paid' : `👤  ${personName || 'They'} paid`}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground px-0.5">
              {paidBy === 'me'
                ? `You paid for ${personName || 'them'} — they'll owe you`
                : `${personName || 'They'} paid for you — you'll owe them`}
            </p>
          </div>

          {/* Category */}
          <div className="space-y-2.5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest block">
              Category
            </label>
            <div className="flex flex-wrap gap-2">
              {EXPENSE_CATEGORIES.map((cat) => {
                const active = category === cat;
                return (
                  <button key={cat} type="button" onClick={() => setCategory(active ? '' : cat)}
                    className="px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all duration-150 flex items-center gap-1.5"
                    style={{
                      background: active ? 'hsl(var(--primary) / 0.15)' : 'hsl(var(--card) / 0.6)',
                      color: active ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                      border: `1px solid ${active ? 'hsl(var(--primary) / 0.25)' : 'hsl(var(--border) / 0.2)'}`,
                    }}>
                    <span>{CATEGORY_EMOJIS[cat] || '📦'}</span> {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Note & Date */}
          <div className="grid grid-cols-5 gap-3">
            <div className="col-span-3 space-y-2">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest block">Note</label>
              <div className="relative">
                <Tag size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                <input type="text" value={reason} onChange={(e) => setReason(e.target.value)}
                  placeholder={category || "What for?"}
                  className="w-full pl-10 pr-4 h-12 rounded-2xl text-sm bg-card/50 outline-none transition-all"
                  style={{ border: '1px solid hsl(var(--border) / 0.3)' }} />
              </div>
            </div>
            <div className="col-span-2 space-y-2">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest block">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full h-12 px-3 rounded-2xl text-sm bg-card/50 outline-none transition-all"
                style={{ border: '1px solid hsl(var(--border) / 0.3)' }} required />
            </div>
          </div>

          {/* Live Summary */}
          {summaryText && (
            <div className="rounded-2xl p-4 flex items-center gap-3"
              style={{
                background: paidBy === 'me' ? 'hsl(var(--success) / 0.07)' : 'hsl(var(--warning) / 0.07)',
                border: `1px solid ${paidBy === 'me' ? 'hsl(var(--success) / 0.12)' : 'hsl(var(--warning) / 0.12)'}`,
              }}>
              <Wallet size={16} className={paidBy === 'me' ? 'text-success' : 'text-warning'} />
              <div>
                <p className="text-sm font-bold">{summaryText}</p>
                {(category || reason) && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">{reason || category}</p>
                )}
              </div>
            </div>
          )}

          {/* Spacer for scroll room */}
          <div className="h-4" />
        </div>
      </form>

      {/* Fixed bottom action */}
      <div className="flex-shrink-0 px-5 pb-8 pt-3" style={{ borderTop: '1px solid hsl(var(--border) / 0.1)' }}>
        <div className="flex gap-3 max-w-lg mx-auto w-full">
          <button type="button" onClick={onClose}
            className="flex-1 rounded-2xl font-semibold text-sm"
            style={{ height: '52px', background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border) / 0.3)' }}
            disabled={isSubmitting}>
            Cancel
          </button>
          <button type="button"
            onClick={() => formRef.current?.requestSubmit()}
            className="flex-[1.5] rounded-2xl font-bold text-sm disabled:opacity-40"
            style={{
              height: '52px',
              background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-glow)))',
              color: 'white',
              boxShadow: '0 6px 20px -6px hsl(var(--primary) / 0.5)',
            }}
            disabled={isSubmitting || !amount || !personName.trim()}>
            {isSubmitting ? 'Adding...' : 'Add Expense'}
          </button>
        </div>
      </div>
    </div>
  );
}
