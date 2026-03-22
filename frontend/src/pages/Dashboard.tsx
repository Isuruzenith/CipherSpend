import { useState, useEffect, Suspense, lazy, useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import type { ExpenseRecord } from '@/components/ledger/AddExpenseForm';
import { useCrypto } from '@/context/CryptoContext';
import { Button } from '@/components/ui/button';
import { LogOut, ShieldCheck } from 'lucide-react';

const TotalDisplay = lazy(() => import('@/components/dashboard/TotalDisplay').then((m) => ({ default: m.TotalDisplay })));
const AnalyticsCharts = lazy(() => import('@/components/dashboard/AnalyticsCharts').then((m) => ({ default: m.AnalyticsCharts })));
const AddExpenseForm = lazy(() => import('@/components/ledger/AddExpenseForm').then((m) => ({ default: m.AddExpenseForm })));
const LedgerView = lazy(() => import('@/components/ledger/LedgerView').then((m) => ({ default: m.LedgerView })));

export default function Dashboard() {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [isChartVisible, setIsChartVisible] = useState(false);
  const { token, logout, email } = useCrypto();
  const chartContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch('http://localhost:8000/api/expenses', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => setExpenses(data))
      .catch(err => console.error("Could not fetch ledger.", err));
  }, [token]);

  useEffect(() => {
    if (isChartVisible) return;
    const target = chartContainerRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsChartVisible(true);
          observer.disconnect();
        }
      },
      { root: null, threshold: 0.1 }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [isChartVisible]);

  const handleAddExpense = (exp: ExpenseRecord) => {
    setExpenses(prev => [...prev, exp]);
  };

  return (
    <MainLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-50 flex items-center gap-2">
            <ShieldCheck className="text-teal-500 w-6 h-6" />
            Encrypted Dashboard
          </h2>
          <p className="text-zinc-400 text-sm">Vault synced for {email}</p>
        </div>
        <div className="flex items-center gap-4">
          <Suspense fallback={<div className="h-10 w-32 rounded-md bg-zinc-900 border border-zinc-800" />}>
            <AddExpenseForm onAdd={handleAddExpense} />
          </Suspense>
          <Button variant="outline" onClick={logout} className="border-zinc-800 text-zinc-300 hover:text-zinc-50 bg-zinc-950">
            <LogOut className="w-4 h-4 mr-2" />
            Lock Vault
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        <div className="lg:col-span-2">
          <Suspense fallback={<div className="h-[220px] rounded-2xl bg-zinc-900/60 border border-zinc-800" />}>
            <TotalDisplay expensesCount={expenses.length} />
          </Suspense>
        </div>
        <div className="lg:col-span-1" ref={chartContainerRef}>
          <Suspense fallback={<div className="h-[320px] rounded-2xl bg-zinc-900/60 border border-zinc-800" />}>
            {isChartVisible ? (
              <AnalyticsCharts expensesCount={expenses.length} />
            ) : (
              <div className="h-[320px] rounded-2xl bg-zinc-900/60 border border-zinc-800" />
            )}
          </Suspense>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <div className="w-full">
          <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
            Secure Ledger
            <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">{expenses.length} records</span>
          </h3>
          <Suspense fallback={<div className="h-[260px] rounded-2xl bg-zinc-900/60 border border-zinc-800" />}>
            <LedgerView expenses={expenses} />
          </Suspense>
        </div>
      </div>
    </MainLayout>
  )
}
