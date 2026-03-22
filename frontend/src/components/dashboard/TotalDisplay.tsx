import React, { useEffect, useState } from 'react';
import { useCrypto } from '../../context/CryptoContext';
import { Lock } from 'lucide-react';

export const TotalDisplay: React.FC<{ expensesCount: number }> = ({ expensesCount }) => {
  const { isCryptoReady, decryptAmount, token } = useCrypto();
  const [total, setTotal] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (!isCryptoReady || !token) return;
    if (expensesCount === 0) {
      setTotal(0);
      return;
    }

    setIsSyncing(true);
    fetch('http://localhost:8000/api/expenses/total', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.totalCiphertext) {
          // Decrypt the single homomorphically aggregated ciphertext locally!
          const val = decryptAmount(data.totalCiphertext);
          setTotal(val);
        }
      })
      .catch(console.error)
      .finally(() => setIsSyncing(false));
  }, [expensesCount, isCryptoReady, decryptAmount]);

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
            <span className="text-accent">$</span>
            {total !== null ? total.toFixed(2) : '---'}
         </div>
         <p className="text-xs text-muted mt-6 font-mono">Aggregated from {expensesCount} encrypted entries</p>
       </div>
    </div>
  )
}
