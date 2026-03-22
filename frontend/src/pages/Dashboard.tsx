import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { TotalDisplay } from '@/components/dashboard/TotalDisplay';
import { AnalyticsCharts } from '@/components/dashboard/AnalyticsCharts';
import { AddExpenseForm, type ExpenseRecord } from '@/components/ledger/AddExpenseForm';
import { LedgerView } from '@/components/ledger/LedgerView';
import { useCrypto } from '@/context/CryptoContext';
import { Button } from '@/components/ui/button';
import { LogOut, ShieldCheck } from 'lucide-react';

export default function Dashboard() {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const { token, logout, email } = useCrypto();

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
          <AddExpenseForm onAdd={handleAddExpense} />
          <Button variant="outline" onClick={logout} className="border-zinc-800 text-zinc-300 hover:text-zinc-50 bg-zinc-950">
            <LogOut className="w-4 h-4 mr-2" />
            Lock Vault
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        <div className="lg:col-span-2">
          <TotalDisplay expensesCount={expenses.length} />
        </div>
        <div className="lg:col-span-1">
          <AnalyticsCharts expensesCount={expenses.length} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <div className="w-full">
          <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
            Secure Ledger
            <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">{expenses.length} records</span>
          </h3>
          <LedgerView expenses={expenses} />
        </div>
      </div>
    </MainLayout>
  )
}
