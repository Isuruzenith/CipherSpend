import React from 'react';
import type { ExpenseRecord } from './AddExpenseForm';
import { FileLock2 } from 'lucide-react';
import { useCrypto } from '../../context/CryptoContext';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const LedgerView: React.FC<{ expenses: ExpenseRecord[] }> = ({ expenses }) => {
  const { isCryptoReady, decryptAmount } = useCrypto();

  if (expenses.length === 0) {
    return (
      <div className="p-12 text-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/40 text-zinc-500 flex flex-col items-center gap-3">
         <FileLock2 size={32} className="opacity-40" />
         <p className="font-medium text-sm">No encrypted entries yet in this session.</p>
      </div>
    )
  }

  // Sort by latest first
  const sorted = [...expenses].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-950/50 overflow-hidden shadow-sm">
      <Table>
        <TableHeader className="bg-zinc-900/80">
          <TableRow className="border-zinc-800 hover:bg-transparent">
            <TableHead className="text-zinc-400 font-medium">Description</TableHead>
            <TableHead className="text-zinc-400 font-medium">Category</TableHead>
            <TableHead className="text-zinc-400 font-medium">Date</TableHead>
            <TableHead className="text-right text-zinc-400 font-medium">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((exp) => {
            let decryptedVal = null;
            try {
              if (isCryptoReady) decryptedVal = decryptAmount(exp.amountCiphertext);
            } catch (e) {
              console.error(e);
            }

            return (
              <TableRow key={exp.id} className="border-zinc-800 hover:bg-zinc-900/50 transition-colors">
                <TableCell className="font-medium text-zinc-100">{exp.description}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="border-zinc-700 bg-zinc-900 text-zinc-300 font-normal">
                    {exp.category}
                  </Badge>
                </TableCell>
                <TableCell className="text-zinc-500 text-xs font-mono">
                  {new Date(exp.timestamp).toLocaleString(undefined, {
                     dateStyle: 'short',
                     timeStyle: 'short'
                  })}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-col items-end gap-1.5">
                    {decryptedVal !== null ? (
                      <span className="text-zinc-50 font-mono font-medium tracking-tight">
                        ${decryptedVal.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-zinc-600 text-xs italic">Decrypting...</span>
                    )}
                    <Badge variant="secondary" className="bg-teal-500/10 hover:bg-teal-500/10 text-teal-400 border border-teal-500/20 text-[9px] uppercase font-semibold tracking-wider px-1.5 py-0 shadow-none">
                      Encrypted until viewed
                    </Badge>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  )
}
