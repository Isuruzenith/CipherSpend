"use client"

import React, { useEffect, useState, useMemo } from 'react';
import { useCrypto } from '../../context/CryptoContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import { Lock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface CategoryData {
  name: string;
  value: number;
}

const COLORS = ['#4ade80', '#2dd4bf', '#818cf8', '#f472b6', '#fbbf24', '#a78bfa'];

export const AnalyticsCharts: React.FC<{ expensesCount: number }> = ({ expensesCount }) => {
  const { isCryptoReady, decryptAmount, token } = useCrypto();
  const [data, setData] = useState<CategoryData[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (!isCryptoReady || !token) return;
    if (expensesCount === 0) {
      setData([]);
      return;
    }

    setIsSyncing(true);
    fetch('http://localhost:8000/api/totals/breakdown', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((breakdown) => {
        if (!breakdown || typeof breakdown !== 'object') {
          throw new Error('Invalid response format');
        }
        const parsed: CategoryData[] = [];
        for (const [category, ciphertext] of Object.entries(breakdown)) {
          try {
            if (typeof ciphertext !== 'string') continue;
            const val = decryptAmount(ciphertext);
            if (val > 0) {
                parsed.push({ name: category, value: Number(val.toFixed(2)) });
            }
          } catch (e: unknown) {
            const errMsg = e instanceof Error ? e.message : String(e);
            const errStack = e instanceof Error ? e.stack : undefined;
            console.error("Failed to decrypt aggregate for", category, "Error:", errMsg, errStack);
          }
        }
        setData(parsed);
      })
      .catch(err => {
        console.error("Analytics fetch failed:", err instanceof Error ? err.message : String(err));
        setData([]); // Clear data on total failure
      })
      .finally(() => setIsSyncing(false));
  }, [expensesCount, isCryptoReady, decryptAmount, token]);

  const chartConfig = useMemo(() => {
    const config: Record<string, any> = {};
    data.forEach((d, i) => {
        config[d.name] = { label: d.name, color: COLORS[i % COLORS.length] };
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
      <CardContent>
        {data.length === 0 ? (
          <div className="h-[250px] flex items-center justify-center text-zinc-600 text-sm">
            {isSyncing ? "Homomorphically aggregating..." : "No data to display"}
          </div>
        ) : (
          <div className="h-[250px] mt-4">
            <ChartContainer config={chartConfig} className="mx-auto h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                        <Pie
                            data={data}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            strokeWidth={2}
                            stroke="var(--color-background)"
                            paddingAngle={2}
                        >
                            {data.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                </ResponsiveContainer>
            </ChartContainer>
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
