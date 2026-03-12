import { cn } from '@/lib/utils';
import { getCurrency } from '@/lib/storage';

interface MoneyDisplayProps {
  amount: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  prefix?: string;
  showSign?: boolean;
}

export function MoneyDisplay({ 
  amount, 
  className, 
  size = 'md', 
  prefix,
  showSign = false 
}: MoneyDisplayProps) {
  const currency = getCurrency();
  const symbol = prefix ?? currency.symbol;
  const isPositive = amount > 0;
  const isNegative = amount < 0;
  const isZero = amount === 0;
  
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-money',
    lg: 'text-money-lg',
    xl: 'text-money-xl'
  };
  
  const colorClass = isZero 
    ? 'money-neutral' 
    : isPositive 
      ? 'money-positive' 
      : 'money-negative';
  
  const displayAmount = Math.abs(amount);
  const sign = showSign && !isZero ? (isPositive ? '+' : '-') : '';
  
  return (
    <span className={cn(
      sizeClasses[size],
      colorClass,
      'font-semibold tabular-nums animate-money-count',
      className
    )}>
      {sign}{symbol}{displayAmount.toLocaleString(currency.locale, { 
        minimumFractionDigits: 0,
        maximumFractionDigits: 2 
      })}
    </span>
  );
}