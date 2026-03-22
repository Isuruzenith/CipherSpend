import React, { useEffect, useState } from 'react';
import { useCrypto } from '../../context/CryptoContext';
import { Lock } from 'lucide-react';
import type { ExpenseRecord } from '@/components/ledger/AddExpenseForm';
import { getCurrencySymbol } from '@/lib/currency';

export const TotalDisplay: React.FC<{ expenses: ExpenseRecord[]; currency: string }> = ({ expenses, currency }) => {
  const { isCryptoReady, decryptAmount } = useCrypto();
  const [total, setTotal] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const expensesCount = expenses.length;

  useEffect(() => {
    if (!isCryptoReady) {
      setTotal(null);
      return;
    }
    if (expensesCount === 0) {
      setTotal(0);
      return;
    }

    setIsSyncing(true);
    let totalByRows = 0;
    for (const exp of expenses) {
      try {
        totalByRows += decryptAmount(exp.amountCiphertext);
      } catch {
        // Ignore row that fails decryption.
      }
    }
    setTotal(totalByRows);
    setIsSyncing(false);
  }, [expensesCount, isCryptoReady, decryptAmount, expenses]);

  return (
    <div className="p-6 md:p-8 rounded-2xl bg-surface border border-surfaceHighlight relative overflow-hidden shadow-xl">
       <div className="absolute -top-6 -right-6 text-background/40 group-hover:text-background/80 transition-colors duration-500">
          <Lock size={160} strokeWidth={1} />
       </div>
       <div className="relative z-10">
         <h2 className="text-muted text-xs font-semibold uppercase tracking-widest mb-2 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isSyncing ? "bg-yellow-500 animate-ping" : "bg-accent animate-pulse"}`}></span>
            Decrypted Total (FHE Server-Side Sum)
         </h2>
          <div className="text-5xl font-bold text-white tracking-tight flex items-baseline gap-1 mt-4">
            <span className="text-accent">{getCurrencySymbol(currency)}</span>
            {total !== null ? total.toFixed(2) : '---'}
          </div>
         <p className="text-xs text-muted mt-6 font-mono">Aggregated from {expensesCount} encrypted entries</p>
       </div>
    </div>
  )
}
