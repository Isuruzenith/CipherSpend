import React, { useEffect, useMemo, useState } from 'react';
import { useCrypto } from '../../context/CryptoContext';
import { ShieldPlus, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';
import { SUPPORTED_CURRENCIES, type SupportedCurrency, getCurrencySymbol } from '@/lib/currency';

export interface ExpenseRecord {
  id: string;
  description: string;
  category: string;
  currency: string;
  amountCiphertext: string;
  timestamp: string;
}

const DEFAULT_CATEGORIES = ['Utilities', 'Food', 'Transportation', 'Travel', 'Education', 'Others'];
const CUSTOM_CATEGORIES_STORAGE_KEY = 'cipherspend.customCategories';

export const AddExpenseForm: React.FC<{
  onAdd: (expense: ExpenseRecord) => void;
  editExpense?: ExpenseRecord | null;
  onCancelEdit?: () => void;
}> = ({ onAdd, editExpense = null, onCancelEdit }) => {
  const { isCryptoReady, encryptAmount, decryptAmount, token } = useCrypto();
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [currency, setCurrency] = useState<SupportedCurrency>('LKR');
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const categories = useMemo(() => {
    if (editExpense && !DEFAULT_CATEGORIES.includes(editExpense.category) && !customCategories.includes(editExpense.category)) {
      return [...DEFAULT_CATEGORIES, ...customCategories, editExpense.category];
    }
    return [...DEFAULT_CATEGORIES, ...customCategories];
  }, [customCategories, editExpense]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CUSTOM_CATEGORIES_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return;
      const normalized = parsed.filter((c): c is string => typeof c === 'string' && c.trim().length > 0);
      setCustomCategories(normalized);
    } catch (error) {
      console.warn('Could not load custom categories from local storage.', error);
    }
  }, []);

  const persistCustomCategories = (next: string[]) => {
    setCustomCategories(next);
    window.localStorage.setItem(CUSTOM_CATEGORIES_STORAGE_KEY, JSON.stringify(next));
  };

  const handleAddCategory = () => {
    const normalized = newCategory.trim();
    if (!normalized) return;
    const alreadyExists = [...DEFAULT_CATEGORIES, ...customCategories].some(
      (existing) => existing.toLowerCase() === normalized.toLowerCase()
    );
    if (alreadyExists) {
      toast.error('Category already exists');
      return;
    }
    const next = [...customCategories, normalized];
    persistCustomCategories(next);
    setCategory(normalized);
    setNewCategory('');
    toast.success('Category added');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCryptoReady || !token || !desc || !amount) return;
    
    const val = parseFloat(amount);
    if (isNaN(val)) return;

    setIsSubmitting(true);
    toast('Encrypting...', { description: 'Running WASM CKKS Encryption' });
    
    // Defer a bit so UI doesn't freeze entirely before toast
    setTimeout(() => {
        try {
            const ct = encryptAmount(val);
            const newExp = {
              id: editExpense?.id ?? Math.random().toString(36).substr(2, 9),
              description: desc,
              category,
              currency,
              amountCiphertext: ct,
              timestamp: editExpense?.timestamp ?? new Date().toISOString()
            };

            fetch(
              editExpense
                ? `http://localhost:8000/api/expenses/${editExpense.id}`
                : 'http://localhost:8000/api/expenses',
              {
              method: editExpense ? 'PUT' : 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify(newExp)
            })
              .then(async (res) => {
                if (!res.ok) {
                  throw new Error(`Save failed (${res.status})`);
                }
                return res.json();
              })
              .then(data => {
                onAdd(data);
                toast.success(editExpense ? 'Expense updated!' : 'Expense encrypted and stored!');
                setDesc('');
                setAmount('');
                setCategory(DEFAULT_CATEGORIES[0]);
                setCurrency('LKR');
                setOpen(false);
                if (onCancelEdit) onCancelEdit();
              })
              .catch(err => {
                 console.error(err);
                 toast.error('Failed to save expense');
              })
              .finally(() => setIsSubmitting(false));
         } catch (e) {
            console.error(e);
            toast.error('Encryption failed');
            setIsSubmitting(false);
         }
    }, 50);
  };

  useEffect(() => {
    if (!editExpense) return;
    setDesc(editExpense.description);
    setCategory(editExpense.category);
    setCurrency((editExpense.currency as SupportedCurrency) || 'LKR');
    setOpen(true);
    try {
      const val = decryptAmount(editExpense.amountCiphertext);
      if (Number.isFinite(val)) {
        setAmount(val.toFixed(2));
      }
    } catch {
      setAmount('');
    }
  }, [editExpense, decryptAmount]);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen && editExpense && onCancelEdit) {
          onCancelEdit();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button className="bg-teal-500 hover:bg-teal-600 text-zinc-950 font-semibold gap-2">
          <Plus size={16} />
          New Expense
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-zinc-950 border-zinc-800 text-zinc-100">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-teal-500/10 p-2 rounded-lg text-teal-400 border border-teal-500/20">
              <ShieldPlus size={20} />
            </div>
             <DialogTitle className="text-xl">Secure New Entry</DialogTitle>
          </div>
          <DialogDescription className="text-zinc-400">
             {editExpense ? 'Update the expense, then re-encrypt before sync.' : 'Amounts are encrypted locally via CKKS before leaving your browser.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-2">
            <Label htmlFor="desc" className="text-zinc-300">Description</Label>
            <Input 
              id="desc"
              type="text" 
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="bg-zinc-900 border-zinc-800 text-zinc-100"
              placeholder="e.g. AWS Hosting Bill"
              required
            />
          </div>
          
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
              <Label className="text-zinc-300">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-100">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2 mt-2">
                <Input
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="bg-zinc-900 border-zinc-800 text-zinc-100 h-9"
                  placeholder="Add category"
                />
                <Button
                  type="button"
                  onClick={handleAddCategory}
                  variant="outline"
                  className="h-9 border-zinc-700 bg-zinc-900 text-zinc-200 hover:text-zinc-100"
                >
                  Add
                </Button>
              </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-zinc-300">Currency</Label>
                <Select value={currency} onValueChange={(v) => setCurrency(v as SupportedCurrency)}>
                  <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-100">
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

            <div className="space-y-2">
              <Label htmlFor="amount" className="text-zinc-300">Amount ({currency})</Label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-zinc-500 font-mono">{getCurrencySymbol(currency)}</span>
                <Input 
                  id="amount"
                  type="number" 
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="font-mono bg-zinc-900 border-zinc-800 text-zinc-100 pl-12"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>
          
            <div className="flex gap-2">
              {editExpense && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-1/3 border-zinc-700 bg-zinc-900 text-zinc-200 hover:text-zinc-100"
                  onClick={() => {
                    setOpen(false);
                    if (onCancelEdit) onCancelEdit();
                  }}
                >
                  Cancel
                </Button>
              )}
              <Button 
                type="submit"
                disabled={!isCryptoReady || isSubmitting}
                className={`${editExpense ? 'w-2/3' : 'w-full'} bg-zinc-100 hover:bg-white text-zinc-950 font-bold`}
              >
                {isSubmitting ? "Encrypting..." : editExpense ? "Encrypt & Update" : "Encrypt & Store"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
  );
}
