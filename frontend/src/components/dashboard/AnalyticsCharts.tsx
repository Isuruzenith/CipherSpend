"use client"

import React, { useEffect, useState, useMemo } from 'react';
import { useCrypto } from '../../context/CryptoContext';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Lock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { ExpenseRecord } from '@/components/ledger/AddExpenseForm';

interface CategoryData {
  name: string;
  value: number;
}

const toColorKey = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const getCategoryColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  const hue = hash % 360;
  const saturation = 70 + (hash % 12);
  const lightness = 52 + (hash % 8);
  return `hsl(${hue} ${saturation}% ${lightness}%)`;
};
const mapCategoryTotalsToChartData = (byCategory: Record<string, number>): CategoryData[] =>
  Object.entries(byCategory)
    .filter(([, value]) => Number.isFinite(value) && value > 0)
    .map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }));

export const AnalyticsCharts: React.FC<{ expenses: ExpenseRecord[] }> = ({ expenses }) => {
  const { isCryptoReady, decryptAmount } = useCrypto();
  const [data, setData] = useState<CategoryData[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const expensesCount = expenses.length;

  useEffect(() => {
    if (!isCryptoReady) {
      setData([]);
      return;
    }
    if (expensesCount === 0) {
      setData([]);
      return;
    }

    setIsSyncing(true);
    const byCategory: Record<string, number> = {};
    for (const exp of expenses) {
      try {
        const value = decryptAmount(exp.amountCiphertext);
        if (!Number.isFinite(value) || value <= 0) continue;
        byCategory[exp.category] = (byCategory[exp.category] ?? 0) + value;
      } catch {
        // Ignore row that fails decryption.
      }
    }
    setData(mapCategoryTotalsToChartData(byCategory));
    setIsSyncing(false);
  }, [expensesCount, isCryptoReady, decryptAmount, expenses]);

  const chartConfig = useMemo(() => {
    const config: Record<string, any> = {};
    data.forEach((d) => {
        config[toColorKey(d.name)] = { label: d.name, color: getCategoryColor(d.name) };
    });
    return config;
  }, [data]);

  return (
    <Card className="bg-zinc-950 border-zinc-800 shadow-xl overflow-hidden relative">
      <CardHeader>
        <div className="flex justify-between items-start">
            <div className="space-y-1">
                <CardTitle className="text-zinc-50 flex items-center gap-2">
                    <span className="bg-teal-500/10 p-1.5 rounded-md text-teal-400">
                        <Lock size={16} />
                    </span>
                    Spending by Category
                </CardTitle>
                <CardDescription className="text-zinc-400">Server-blind aggregation rendered locally</CardDescription>
            </div>
            {isSyncing && (
                <span className="flex h-2 w-2 relative mt-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                </span>
            )}
        </div>
      </CardHeader>
      <CardContent className="pb-5">
        {data.length === 0 ? (
          <div className="h-[250px] flex items-center justify-center text-zinc-600 text-sm">
            {isSyncing ? "Homomorphically aggregating..." : "No data to display"}
          </div>
        ) : (
          <div className="mt-5 space-y-6">
            <div className="flex justify-center">
              <ChartContainer config={chartConfig} className="h-[340px] w-[340px] max-w-full">
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                          <Pie
                              data={data}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={88}
                              outerRadius={132}
                              strokeWidth={2}
                              stroke="var(--color-background)"
                              paddingAngle={2}
                          >
                              {data.map((entry) => (
                                  <Cell key={`cell-${entry.name}`} fill={getCategoryColor(entry.name)} />
                              ))}
                          </Pie>
                      </PieChart>
                  </ResponsiveContainer>
              </ChartContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 px-2 pb-2">
              {data.map((entry) => (
                <div key={entry.name} className="flex items-center gap-2 text-sm text-zinc-300">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: getCategoryColor(entry.name) }}
                  />
                  <span className="truncate max-w-[180px]">{entry.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm pt-4 border-t border-zinc-800/50">
        <div className="hidden sm:flex items-center gap-2 font-medium leading-none text-zinc-300">
          Decrypted securely in your browser using node-seal
        </div>
        <div className="leading-none text-zinc-500 font-mono text-xs">
          Each slice represents a separately encrypted sum from the server
        </div>
      </CardFooter>
    </Card>
  )
}
