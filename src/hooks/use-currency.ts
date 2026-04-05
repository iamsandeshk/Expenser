import { useEffect, useState } from 'react';
import { getCurrency, type CurrencyInfo } from '@/lib/storage';

export function useCurrency(): CurrencyInfo {
  const [currency, setCurrencyState] = useState<CurrencyInfo>(() => getCurrency());

  useEffect(() => {
    const sync = () => setCurrencyState(getCurrency());
    window.addEventListener('splitmate_currency_changed', sync);
    window.addEventListener('focus', sync);
    return () => {
      window.removeEventListener('splitmate_currency_changed', sync);
      window.removeEventListener('focus', sync);
    };
  }, []);

  return currency;
}
