import { X, CheckCircle2, Trash2, History } from 'lucide-react';
import { createPortal } from 'react-dom';
import { MoneyDisplay } from '@/components/MoneyDisplay';
import { type PersonBalance } from '@/lib/storage';

interface PersonDetailsModalProps {
  person: PersonBalance;
  isOpen: boolean;
  onClose: () => void;
  onSettle: () => void;
  onDeleteTransaction: (transactionId: string) => void;
}

export function PersonDetailsModal({ 
  person, 
  isOpen, 
  onClose, 
  onSettle, 
  onDeleteTransaction 
}: PersonDetailsModalProps) {
  if (!isOpen) return null;
  
  const sortedTransactions = person.transactions.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  
  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[10001] p-4">
      <div className="bg-card rounded-t-xl sm:rounded-xl w-full max-w-md max-h-[80vh] flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold">{person.name}</h2>
            <p className="text-sm text-muted-foreground">
              {person.transactions.length} transaction{person.transactions.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Balance Summary */}
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-secondary/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">They gave you</p>
              <MoneyDisplay amount={person.totalGiven} size="sm" className="text-green-400" />
            </div>
            <div className="text-center p-3 bg-secondary/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">You gave them</p>
              <MoneyDisplay amount={person.totalOwed} size="sm" className="text-red-400" />
            </div>
          </div>
          
          <div className="text-center p-4 bg-primary/10 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Net Balance</p>
            <MoneyDisplay amount={person.netBalance} size="lg" showSign={true} />
            <p className="text-xs text-muted-foreground mt-1">
              {person.netBalance > 0 
                ? "They owe you" 
                : person.netBalance < 0 
                  ? "You owe them" 
                  : "All settled!"
              }
            </p>
          </div>
          
          {person.netBalance !== 0 && (
            <button 
              onClick={onSettle}
              className="btn-success w-full flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={20} />
              Settle Up
            </button>
          )}
        </div>
        
        {/* Transactions List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <h3 className="font-semibold flex items-center gap-2 mb-4">
              <History size={18} />
              Transaction History
            </h3>
            
            {sortedTransactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No transactions</p>
            ) : (
              <div className="space-y-3">
                {sortedTransactions.map((transaction) => (
                  <div key={transaction.id} className="bg-secondary/30 p-3 rounded-lg group">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {transaction.reason || 'Shared expense'}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span>{new Date(transaction.date).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>
                            {transaction.paidBy === 'me' 
                              ? 'You paid' 
                              : `${person.name} paid`
                            }
                          </span>
                          {transaction.settled && (
                            <>
                              <span>•</span>
                              <span className="text-green-400">Settled</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <MoneyDisplay amount={transaction.amount} size="sm" />
                          <p className="text-xs text-muted-foreground">
                            {transaction.paidBy === 'me' && transaction.forPerson === person.name && '+'}
                            {transaction.paidBy === person.name && transaction.forPerson === 'me' && '-'}
                          </p>
                        </div>
                        <button
                          onClick={() => onDeleteTransaction(transaction.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-danger hover:bg-danger/10 rounded"
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
        </div>
      </div>
    </div>,
    document.body
  );
}