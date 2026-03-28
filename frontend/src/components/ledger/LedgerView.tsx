import React from 'react';
import type { ExpenseRecord } from './AddExpenseForm';
import { FileLock2, Pencil, Trash2 } from 'lucide-react';
import { useCrypto } from '../../context/CryptoContext';
import { getCurrencySymbol } from '@/lib/currency';

/* ── Category colour — same hash fn as AnalyticsCharts ── */
const getCategoryColor = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return `hsl(${hash % 360} ${65 + (hash % 12)}% ${55 + (hash % 8)}%)`;
};

const iconBtn = (color: 'teal' | 'red'): React.CSSProperties => ({
  width: 30, height: 30, borderRadius: 7,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: color === 'teal' ? 'rgba(20,184,166,0.06)' : 'rgba(239,68,68,0.06)',
  border: `1px solid ${color === 'teal' ? 'rgba(20,184,166,0.18)' : 'rgba(239,68,68,0.18)'}`,
  cursor: 'pointer', transition: 'background .15s, border-color .15s',
  color: color === 'teal' ? '#5eead4' : '#f87171',
  flexShrink: 0,
});

export const LedgerView: React.FC<{
  expenses: ExpenseRecord[];
  onEdit: (expense: ExpenseRecord) => void;
  onDelete: (expenseId: string) => void;
}> = ({ expenses, onEdit, onDelete }) => {
  const { isCryptoReady, decryptAmount } = useCrypto();

  /* ── Empty state ── */
  if (expenses.length === 0) {
    return (
      <div style={{
        padding: '48px 24px', textAlign: 'center',
        borderRadius: 14,
        border: '1px dashed rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.01)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 12,
        fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 10,
          background: 'rgba(20,184,166,0.06)',
          border: '1px solid rgba(20,184,166,0.14)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <FileLock2 size={20} color="#3f3f46" />
        </div>
        <p style={{ fontSize: 13, color: '#3f3f46', margin: 0, fontFamily: '"IBM Plex Mono", monospace' }}>
          No encrypted entries in this session.
        </p>
      </div>
    );
  }

  const sorted = [...expenses].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  /* ── Col widths ── */
  const COL = { desc: '28%', cat: '18%', cur: '8%', date: '16%', amt: '18%', act: '12%' };

  return (
    <div style={{
      borderRadius: 14,
      border: '1px solid rgba(255,255,255,0.07)',
      overflow: 'hidden',
      fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
    }}>
      {/* ── Header row ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `${COL.desc} ${COL.cat} ${COL.cur} ${COL.date} ${COL.amt} ${COL.act}`,
        background: 'rgba(255,255,255,0.02)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '10px 16px',
      }}>
        {['Description', 'Category', 'Cur', 'Date', 'Amount', 'Actions'].map((h, i) => (
          <div key={h} style={{
            fontSize: 10, fontWeight: 700, color: '#3f3f46',
            letterSpacing: '0.09em', textTransform: 'uppercase',
            fontFamily: '"IBM Plex Mono", monospace',
            textAlign: i >= 4 ? 'right' : 'left',
          }}>{h}</div>
        ))}
      </div>

      {/* ── Rows ── */}
      <div>
        {sorted.map((exp, rowIdx) => {
          let decryptedVal: number | null = null;
          try {
            if (isCryptoReady) decryptedVal = decryptAmount(exp.amountCiphertext);
          } catch { /* skip */ }

          const catColor = getCategoryColor(exp.category);
          const sym = getCurrencySymbol(exp.currency || 'LKR');
          const isLast = rowIdx === sorted.length - 1;

          return (
            <div
              key={exp.id}
              style={{
                display: 'grid',
                gridTemplateColumns: `${COL.desc} ${COL.cat} ${COL.cur} ${COL.date} ${COL.amt} ${COL.act}`,
                padding: '12px 16px',
                borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.04)',
                background: 'transparent',
                alignItems: 'center',
                transition: 'background .15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {/* Description */}
              <div style={{
                fontSize: 14, fontWeight: 600, color: '#e4e4e7',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                paddingRight: 12,
              }}>
                {exp.description}
              </div>

              {/* Category pill */}
              <div style={{ paddingRight: 8 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '3px 8px', borderRadius: 5,
                  background: `${catColor}14`,
                  border: `1px solid ${catColor}30`,
                  fontSize: 12, color: catColor,
                  maxWidth: '100%', overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: catColor, flexShrink: 0 }} />
                  {exp.category}
                </span>
              </div>

              {/* Currency */}
              <div style={{
                fontSize: 11, color: '#52525b',
                fontFamily: '"IBM Plex Mono", monospace',
                letterSpacing: '0.05em',
              }}>
                {exp.currency || 'LKR'}
              </div>

              {/* Date */}
              <div style={{
                fontSize: 11, color: '#52525b',
                fontFamily: '"IBM Plex Mono", monospace',
              }}>
                {new Date(exp.timestamp).toLocaleString(undefined, {
                  dateStyle: 'short', timeStyle: 'short',
                })}
              </div>

              {/* Amount */}
              <div style={{ textAlign: 'right', paddingRight: 8 }}>
                {decryptedVal !== null ? (
                  <div>
                    <div style={{
                      fontSize: 14, fontWeight: 700, color: '#f4f4f5',
                      fontFamily: '"IBM Plex Mono", monospace', letterSpacing: '-0.01em',
                    }}>
                      <span style={{ color: '#14b8a6', marginRight: 1 }}>{sym}</span>
                      {decryptedVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div style={{
                      fontSize: 10, color: '#14b8a6',
                      fontFamily: '"IBM Plex Mono", monospace',
                      letterSpacing: '0.06em', marginTop: 2, opacity: 0.6,
                    }}>
                      ⟨ct⟩ decrypted
                    </div>
                  </div>
                ) : (
                  <span style={{
                    fontSize: 12, color: '#3f3f46', fontStyle: 'italic',
                    fontFamily: '"IBM Plex Mono", monospace',
                  }}>decrypting…</span>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => onEdit(exp)}
                  style={iconBtn('teal')}
                  title="Edit"
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(20,184,166,0.12)';
                    e.currentTarget.style.borderColor = 'rgba(20,184,166,0.35)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(20,184,166,0.06)';
                    e.currentTarget.style.borderColor = 'rgba(20,184,166,0.18)';
                  }}
                >
                  <Pencil size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(exp.id)}
                  style={iconBtn('red')}
                  title="Delete"
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(239,68,68,0.12)';
                    e.currentTarget.style.borderColor = 'rgba(239,68,68,0.35)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(239,68,68,0.06)';
                    e.currentTarget.style.borderColor = 'rgba(239,68,68,0.18)';
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
