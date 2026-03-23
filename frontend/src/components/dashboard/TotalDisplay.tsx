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
    if (!isCryptoReady) { setTotal(null); return; }
    if (expensesCount === 0) { setTotal(0); return; }
    setIsSyncing(true);
    let sum = 0;
    for (const exp of expenses) {
      try { sum += decryptAmount(exp.amountCiphertext); } catch { /* skip */ }
    }
    setTotal(sum);
    setIsSyncing(false);
  }, [expensesCount, isCryptoReady, decryptAmount, expenses]);

  const sym = getCurrencySymbol(currency);

  return (
    <div style={{
      padding: '24px 24px 20px',
      borderRadius: 16,
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.07)',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
    }}>
      {/* Teal corner glow */}
      <div style={{
        position: 'absolute', top: 0, left: 0, width: 100, height: 100,
        background: 'radial-gradient(circle at 0 0, rgba(20,184,166,0.09), transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Ghost lock icon */}
      <div style={{
        position: 'absolute', bottom: -20, right: -10,
        color: 'rgba(20,184,166,0.04)', pointerEvents: 'none',
        lineHeight: 1,
      }}>
        <Lock size={150} strokeWidth={1} />
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Section label */}
        <div style={{
          fontSize: 10, fontWeight: 700, color: '#52525b',
          letterSpacing: '0.09em', textTransform: 'uppercase',
          fontFamily: '"IBM Plex Mono", monospace',
          display: 'flex', alignItems: 'center', gap: 7, marginBottom: 18,
        }}>
          <span style={{ width: 16, height: 1, background: 'rgba(20,184,166,0.4)', display: 'inline-block' }} />
          Decrypted Total
          {/* Syncing dot */}
          <span style={{ position: 'relative', width: 7, height: 7, marginLeft: 4 }}>
            {isSyncing && (
              <span style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                background: 'rgba(234,179,8,0.5)',
                animation: 'ping 1s cubic-bezier(0,0,0.2,1) infinite',
              }} />
            )}
            <span style={{
              position: 'relative', display: 'block', width: 7, height: 7,
              borderRadius: '50%',
              background: isSyncing ? '#eab308' : '#14b8a6',
              boxShadow: isSyncing ? '0 0 6px #eab308' : '0 0 6px #14b8a6',
              transition: 'background .3s, box-shadow .3s',
            }} />
          </span>
        </div>

        {/* Amount */}
        <div style={{
          display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6,
        }}>
          <span style={{
            fontSize: 28, fontWeight: 800, color: '#14b8a6',
            letterSpacing: '-0.01em', lineHeight: 1,
            fontFamily: '"IBM Plex Mono", monospace',
          }}>
            {sym}
          </span>
          <span style={{
            fontSize: 52, fontWeight: 800, color: '#f4f4f5',
            letterSpacing: '-0.03em', lineHeight: 1,
          }}>
            {total !== null
              ? total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
              : '—'}
          </span>
        </div>

        {/* Sub-label */}
        <div style={{
          fontSize: 11, color: '#3f3f46',
          fontFamily: '"IBM Plex Mono", monospace',
          letterSpacing: '0.03em', marginTop: 14,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '3px 8px', borderRadius: 5,
            background: 'rgba(20,184,166,0.06)',
            border: '1px solid rgba(20,184,166,0.14)',
            color: '#14b8a6', fontSize: 10, fontWeight: 600,
          }}>
            FHE
          </span>
          Aggregated from {expensesCount} encrypted {expensesCount === 1 ? 'entry' : 'entries'}
        </div>
      </div>

      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>
    </div>
  );
};
