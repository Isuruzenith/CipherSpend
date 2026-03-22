import React, { useState } from 'react';
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

export interface ExpenseRecord {
  id: string;
  description: string;
  category: string;
  amountCiphertext: string;
  timestamp: string;
}

export const AddExpenseForm: React.FC<{ onAdd: (expense: ExpenseRecord) => void }> = ({ onAdd }) => {
  const { isCryptoReady, encryptAmount, token } = useCrypto();
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('General');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [open, setOpen] = useState(false);

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
              id: Math.random().toString(36).substr(2, 9),
              description: desc,
              category,
              amountCiphertext: ct,
              timestamp: new Date().toISOString()
            };

            fetch('http://localhost:8000/api/expenses', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify(newExp)
            })
              .then(res => res.json())
              .then(data => {
                onAdd(data);
                toast.success('Expense encrypted and stored!');
                setDesc('');
                setAmount('');
                setOpen(false);
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
            Amounts are encrypted locally via CKKS before leaving your browser.
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
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-zinc-300">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-100">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                  <SelectItem value="General">General</SelectItem>
                  <SelectItem value="Cloud Infrastructure">Cloud Infrastructure</SelectItem>
                  <SelectItem value="Software">Software</SelectItem>
                  <SelectItem value="Food">Food</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-zinc-300">Amount (USD)</Label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-zinc-500 font-mono">$</span>
                <Input 
                  id="amount"
                  type="number" 
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="font-mono bg-zinc-900 border-zinc-800 text-zinc-100 pl-7"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>
          </div>
          
          <Button 
            type="submit"
            disabled={!isCryptoReady || isSubmitting}
            className="w-full bg-zinc-100 hover:bg-white text-zinc-950 font-bold"
          >
            {isSubmitting ? "Encrypting..." : "Encrypt & Store"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
