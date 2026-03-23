"use client"

import React, { useEffect, useState, useMemo } from 'react';
import { useCrypto } from '../../context/CryptoContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Lock } from 'lucide-react';
import type { ExpenseRecord } from '@/components/ledger/AddExpenseForm';

interface CategoryData {
  name: string;
  value: number;
}

const getCategoryColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  const hue = hash % 360;
  const saturation = 65 + (hash % 12);
  const lightness = 55 + (hash % 8);
  return `hsl(${hue} ${saturation}% ${lightness}%)`;
};

const mapCategoryTotalsToChartData = (byCategory: Record<string, number>): CategoryData[] =>
  Object.entries(byCategory)
    .filter(([, value]) => Number.isFinite(value) && value > 0)
    .map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }));

/* ── Custom donut tooltip ── */
function CipherTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0].payload;
  return (
    <div style={{
      background: '#0f1214',
      border: '1px solid rgba(255,255,255,0.09)',
      borderRadius: 9, padding: '9px 14px',
      fontFamily: '"IBM Plex Mono", monospace',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    }}>
      <div style={{ fontSize: 11, color: '#52525b', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>
        {name}
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#f4f4f5' }}>
        {value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
    </div>
  );
}

export const AnalyticsCharts: React.FC<{ expenses: ExpenseRecord[] }> = ({ expenses }) => {
  const { isCryptoReady, decryptAmount } = useCrypto();
  const [data, setData] = useState<CategoryData[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const expensesCount = expenses.length;

  useEffect(() => {
    if (!isCryptoReady) { setData([]); return; }
    if (expensesCount === 0) { setData([]); return; }

    setIsSyncing(true);
    const byCategory: Record<string, number> = {};
    for (const exp of expenses) {
      try {
        const value = decryptAmount(exp.amountCiphertext);
        if (!Number.isFinite(value) || value <= 0) continue;
        byCategory[exp.category] = (byCategory[exp.category] ?? 0) + value;
      } catch { /* skip */ }
    }
    setData(mapCategoryTotalsToChartData(byCategory));
    setIsSyncing(false);
  }, [expensesCount, isCryptoReady, decryptAmount, expenses]);

  const total = useMemo(() => data.reduce((sum, d) => sum + d.value, 0), [data]);

  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 16,
      overflow: 'hidden',
      position: 'relative',
      fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
    }}>
      {/* Teal corner glow */}
      <div style={{
        position: 'absolute', top: 0, left: 0, width: 80, height: 80,
        background: 'radial-gradient(circle at 0 0, rgba(20,184,166,0.07), transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* ── Header ── */}
      <div style={{
        padding: '18px 20px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 7,
              background: 'rgba(20,184,166,0.08)',
              border: '1px solid rgba(20,184,166,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Lock size={13} color="#14b8a6" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#f4f4f5', letterSpacing: '-0.01em' }}>
                Spending by Category
              </div>
              <div style={{ fontSize: 12, color: '#52525b', fontFamily: '"IBM Plex Mono", monospace', marginTop: 1 }}>
                Server-blind aggregation · local decrypt
              </div>
            </div>
          </div>
        </div>

        {/* Syncing indicator */}
        {isSyncing && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <span style={{ position: 'relative', width: 8, height: 8 }}>
              <span style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                background: 'rgba(20,184,166,0.4)',
                animation: 'ping 1s cubic-bezier(0,0,0.2,1) infinite',
              }} />
              <span style={{
                position: 'relative', display: 'block', width: 8, height: 8,
                borderRadius: '50%', background: '#14b8a6',
              }} />
            </span>
            <span style={{ fontSize: 11, color: '#14b8a6', fontFamily: '"IBM Plex Mono", monospace', letterSpacing: '0.05em' }}>
              SYNCING
            </span>
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div style={{ padding: '16px 20px 0' }}>
        {data.length === 0 ? (
          <div style={{
            height: 260, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 10,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'rgba(20,184,166,0.06)',
              border: '1px solid rgba(20,184,166,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Lock size={16} color="#3f3f46" />
            </div>
            <span style={{ fontSize: 13, color: '#3f3f46', fontFamily: '"IBM Plex Mono", monospace' }}>
              {isSyncing ? 'Homomorphically aggregating…' : 'No data to display'}
            </span>
          </div>
        ) : (
          <>
            {/* Donut chart */}
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
              <ResponsiveContainer width={300} height={300}>
                <PieChart>
                  <Tooltip cursor={false} content={<CipherTooltip />} />
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    cx="50%" cy="50%"
                    innerRadius={82} outerRadius={126}
                    strokeWidth={2}
                    stroke="rgba(8,10,12,0.8)"
                    paddingAngle={2}
                  >
                    {data.map((entry) => (
                      <Cell key={`cell-${entry.name}`} fill={getCategoryColor(entry.name)} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Centre label */}
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center', pointerEvents: 'none',
              }}>
                <div style={{
                  fontSize: 11, color: '#52525b', letterSpacing: '0.07em',
                  textTransform: 'uppercase', fontFamily: '"IBM Plex Mono", monospace',
                  marginBottom: 3,
                }}>Total</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#f4f4f5', letterSpacing: '-0.02em' }}>
                  {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: 10, color: '#3f3f46', fontFamily: '"IBM Plex Mono", monospace', marginTop: 2 }}>
                  {data.length} {data.length === 1 ? 'category' : 'categories'}
                </div>
              </div>
            </div>

            {/* Legend pills */}
            <div style={{
              display: 'flex', flexWrap: 'wrap',
              justifyContent: 'center', gap: '6px 12px',
              padding: '4px 0 16px',
            }}>
              {data.map((entry) => {
                const pct = total > 0 ? ((entry.value / total) * 100).toFixed(1) : '0';
                return (
                  <div key={entry.name} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '4px 10px', borderRadius: 6,
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    <span style={{
                      width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                      background: getCategoryColor(entry.name),
                    }} />
                    <span style={{ fontSize: 12, color: '#a1a1aa', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {entry.name}
                    </span>
                    <span style={{ fontSize: 11, color: '#52525b', fontFamily: '"IBM Plex Mono", monospace' }}>
                      {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── Footer ── */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.05)',
        padding: '10px 20px',
        display: 'flex', flexDirection: 'column', gap: 3,
      }}>
        <div style={{ fontSize: 12, color: '#3f3f46', fontFamily: '"IBM Plex Mono", monospace' }}>
          Decrypted securely in-browser via node-seal WASM
        </div>
        <div style={{ fontSize: 11, color: '#27272a', fontFamily: '"IBM Plex Mono", monospace', letterSpacing: '0.03em' }}>
          Each slice = separately encrypted sum · CKKS scheme · scale 2⁴⁰
        </div>
      </div>

      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
