import { useState, useEffect, Suspense, lazy, useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import type { ExpenseRecord } from '@/components/ledger/AddExpenseForm';
import { useCrypto } from '@/context/CryptoContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LogOut, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { SUPPORTED_CURRENCIES, type SupportedCurrency } from '@/lib/currency';

const TotalDisplay = lazy(() => import('@/components/dashboard/TotalDisplay').then((m) => ({ default: m.TotalDisplay })));
const AnalyticsCharts = lazy(() => import('@/components/dashboard/AnalyticsCharts').then((m) => ({ default: m.AnalyticsCharts })));
const AddExpenseForm = lazy(() => import('@/components/ledger/AddExpenseForm').then((m) => ({ default: m.AddExpenseForm })));
const LedgerView = lazy(() => import('@/components/ledger/LedgerView').then((m) => ({ default: m.LedgerView })));

type FilterRange = 'day' | 'week' | 'month' | 'custom';

export default function Dashboard() {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [isChartVisible, setIsChartVisible] = useState(false);
  const [filterRange, setFilterRange] = useState<FilterRange>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState<SupportedCurrency>('LKR');
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
    if (editingExpenseId) {
      setExpenses((prev) => prev.map((item) => (item.id === exp.id ? exp : item)));
      setEditingExpenseId(null);
      return;
    }
    setExpenses(prev => [...prev, exp]);
  };

  const handleEditExpense = (expense: ExpenseRecord) => {
    setEditingExpenseId(expense.id);
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`http://localhost:8000/api/expenses/${expenseId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      setExpenses((prev) => prev.filter((item) => item.id !== expenseId));
      toast.success('Expense deleted');
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete expense');
    }
  };

  const getStartOfDay = (date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const getEndOfDay = (date: Date) => {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  };

  const getDateRange = (): { start: Date | null; end: Date | null } => {
    const now = new Date();
    if (filterRange === 'day') {
      return { start: getStartOfDay(now), end: getEndOfDay(now) };
    }
    if (filterRange === 'week') {
      const start = getStartOfDay(new Date(now));
      const day = start.getDay();
      const diff = day === 0 ? 6 : day - 1;
      start.setDate(start.getDate() - diff);
      return { start, end: getEndOfDay(now) };
    }
    if (filterRange === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: getStartOfDay(start), end: getEndOfDay(now) };
    }
    if (!customStart && !customEnd) return { start: null, end: null };
    const start = customStart ? getStartOfDay(new Date(customStart)) : null;
    const end = customEnd ? getEndOfDay(new Date(customEnd)) : null;
    return { start, end };
  };

  const { start: rangeStart, end: rangeEnd } = getDateRange();
  const filteredExpenses = expenses.filter((expense) => {
    const ts = new Date(expense.timestamp);
    if (Number.isNaN(ts.getTime())) return false;
    if (rangeStart && ts < rangeStart) return false;
    if (rangeEnd && ts > rangeEnd) return false;
    if ((expense.currency || 'LKR') !== selectedCurrency) return false;
    return true;
  });

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
            <AddExpenseForm
              onAdd={handleAddExpense}
              editExpense={expenses.find((item) => item.id === editingExpenseId) ?? null}
              onCancelEdit={() => setEditingExpenseId(null)}
            />
          </Suspense>
          <Button variant="outline" onClick={logout} className="border-zinc-800 text-zinc-300 hover:text-zinc-50 bg-zinc-950">
            <LogOut className="w-4 h-4 mr-2" />
            Lock Vault
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10 items-start">
        <div>
          <Suspense fallback={<div className="h-[220px] rounded-2xl bg-zinc-900/60 border border-zinc-800" />}>
            <TotalDisplay expenses={filteredExpenses} currency={selectedCurrency} />
          </Suspense>
          <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                  Currency
                </div>
                <Select value={selectedCurrency} onValueChange={(v) => setSelectedCurrency(v as SupportedCurrency)}>
                  <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-200">
                    <SelectValue placeholder="Currency" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                    {SUPPORTED_CURRENCIES.map((cur) => (
                      <SelectItem key={cur} value={cur}>{cur}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">
              Filter Range
            </div>
            <div className="flex flex-wrap gap-2">
              {(['day', 'week', 'month', 'custom'] as const).map((range) => (
                <Button
                  key={range}
                  type="button"
                  size="sm"
                  variant={filterRange === range ? 'default' : 'outline'}
                  onClick={() => setFilterRange(range)}
                  className={filterRange === range ? 'bg-teal-500 text-zinc-950 hover:bg-teal-400' : 'border-zinc-700 bg-zinc-900 text-zinc-300'}
                >
                  {range === 'day' ? 'Day' : range === 'week' ? 'Week' : range === 'month' ? 'Month' : 'Custom'}
                </Button>
              ))}
            </div>
            {filterRange === 'custom' && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="bg-zinc-950 border-zinc-800 text-zinc-200"
                />
                <Input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="bg-zinc-950 border-zinc-800 text-zinc-200"
                />
              </div>
            )}
          </div>
        </div>
        <div ref={chartContainerRef}>
          <Suspense fallback={<div className="h-[460px] rounded-2xl bg-zinc-900/60 border border-zinc-800" />}>
            {isChartVisible ? (
              <AnalyticsCharts expenses={filteredExpenses} />
            ) : (
              <div className="h-[460px] rounded-2xl bg-zinc-900/60 border border-zinc-800" />
            )}
          </Suspense>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <div className="w-full">
          <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
            Secure Ledger
            <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">{filteredExpenses.length} records</span>
          </h3>
          <Suspense fallback={<div className="h-[260px] rounded-2xl bg-zinc-900/60 border border-zinc-800" />}>
            <LedgerView expenses={filteredExpenses} onEdit={handleEditExpense} onDelete={handleDeleteExpense} />
          </Suspense>
        </div>
      </div>
    </MainLayout>
  )
}
