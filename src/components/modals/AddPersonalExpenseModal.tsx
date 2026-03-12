
import { useState } from 'react';
import { savePersonalExpense, generateId, EXPENSE_CATEGORIES, getCurrency, type PersonalExpense } from '@/lib/storage';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Receipt, Tag, CalendarDays } from 'lucide-react';

interface AddPersonalExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: () => void;
}

const CATEGORY_EMOJIS: Record<string, string> = {
  Food: '🍕', Transport: '🚗', Shopping: '🛍️', Entertainment: '🎬',
  Health: '💊', Bills: '📄', Education: '📚', Travel: '✈️',
  Rent: '🏠', Other: '📦',
};

export function AddPersonalExpenseModal({ isOpen, onClose, onAdd }: AddPersonalExpenseModalProps) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  if (!isOpen) return null;
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || !reason || !category) return;
    
    setIsSubmitting(true);
    
    const expense: PersonalExpense = {
      id: generateId(),
      amount: parseFloat(amount),
      reason: reason.trim(),
      category,
      date,
      createdAt: new Date().toISOString()
    };
    
    savePersonalExpense(expense);
    
    setAmount('');
    setReason('');
    setCategory(EXPENSE_CATEGORIES[0]);
    setDate(new Date().toISOString().split('T')[0]);
    setIsSubmitting(false);
    
    onAdd();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="liquid-glass border-0 max-w-md animate-scale-in p-0">
        {/* Gradient header */}
        <div className="px-6 pt-6 pb-4" style={{
          background: 'linear-gradient(135deg, hsl(var(--success) / 0.1) 0%, transparent 60%)',
        }}>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, hsl(var(--success)), hsl(var(--success-glow)))',
                  boxShadow: '0 4px 14px -3px hsl(var(--success) / 0.5)',
                }}>
                <Receipt size={18} color="white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">New Expense</DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  Track your personal spending
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-5">
          {/* Amount - hero input */}
          <div className="text-center py-3">
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Amount</label>
            <div className="relative inline-flex items-baseline justify-center gap-1">
              <span className="text-2xl font-bold text-muted-foreground">{getCurrency().symbol}</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="text-4xl font-bold bg-transparent border-none outline-none text-center text-foreground w-40 placeholder:text-muted-foreground/30"
                style={{ caretColor: 'hsl(var(--success))' }}
                step="0.01"
                min="0"
                required
              />
            </div>
            <div className="w-16 h-0.5 rounded-full mx-auto mt-2" style={{
              background: amount ? 'hsl(var(--success))' : 'hsl(var(--border))',
              transition: 'background 0.3s ease',
            }} />
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">What was it for?</label>
            <div className="relative">
              <Tag size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Coffee, groceries, taxi..."
                className="input-liquid pl-10 h-12 rounded-2xl text-sm"
                required
              />
            </div>
          </div>

          {/* Category - emoji grid */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Category</label>
            <div className="grid grid-cols-5 gap-2">
              {EXPENSE_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className="flex flex-col items-center gap-1 py-2.5 rounded-2xl transition-all duration-200 border"
                  style={{
                    background: category === cat ? 'hsl(var(--primary) / 0.15)' : 'hsl(var(--secondary) / 0.4)',
                    borderColor: category === cat ? 'hsl(var(--primary) / 0.3)' : 'transparent',
                    transform: category === cat ? 'scale(1.08)' : 'scale(1)',
                    boxShadow: category === cat ? '0 4px 12px -4px hsl(var(--primary) / 0.3)' : 'none',
                  }}
                >
                  <span className="text-lg">{CATEGORY_EMOJIS[cat] || '📦'}</span>
                  <span className="text-[9px] font-semibold" style={{
                    color: category === cat ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                  }}>{cat}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Date</label>
            <div className="relative">
              <CalendarDays size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input-liquid pl-10 h-11 rounded-2xl text-sm"
                required
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-12 flex-1 rounded-2xl font-semibold text-sm transition-all duration-200"
              style={{
                background: 'hsl(var(--secondary))',
                color: 'hsl(var(--secondary-foreground))',
                border: '1px solid hsl(var(--border) / 0.3)',
              }}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-12 flex-[1.5] rounded-2xl font-semibold text-sm transition-all duration-200 disabled:opacity-40"
              style={{
                background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-glow)))',
                color: 'hsl(var(--primary-foreground))',
                boxShadow: '0 4px 16px -4px hsl(var(--primary) / 0.5)',
              }}
              disabled={isSubmitting || !amount || !reason}
            >
              {isSubmitting ? 'Adding...' : 'Add Expense'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
