import React from 'react';
import { Link } from 'react-router-dom';
import { useCrypto } from '../../context/CryptoContext';
import { ShieldCheck, ShieldAlert, Settings as SettingsIcon } from 'lucide-react';

export const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isCryptoReady } = useCrypto();

  return (
    <div className="min-h-screen bg-zinc-950 text-gray-200 flex flex-col">
      <header className="border-b border-zinc-800 bg-zinc-950/80 sticky top-0 z-10 transition-colors duration-300">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-teal-500 rounded flex items-center justify-center text-zinc-950 font-bold text-xl shadow-[0_0_15px_rgba(20,184,166,0.3)]">C</div>
             <span className="font-bold text-lg tracking-tight text-white">CipherSpend<span className="text-teal-400">Cloud</span></span>
          </div>
          <div className="flex items-center gap-3 text-sm">
             <Link to="/settings" className="p-1.5 hover:bg-zinc-800 rounded-md transition-colors text-zinc-400 hover:text-white">
                <SettingsIcon size={18} />
             </Link>
             {isCryptoReady ? (
               <span className="flex items-center gap-1.5 text-accent bg-accent/10 px-2.5 py-1 rounded text-xs font-medium border border-accent/20 shadow-sm transition-all duration-300">
                 <ShieldCheck size={14} /> WASM Secured
               </span>
             ) : (
               <span className="flex items-center gap-1.5 text-yellow-500 bg-yellow-500/10 px-2.5 py-1 rounded text-xs font-medium border border-yellow-500/20 shadow-sm animate-pulse">
                 <ShieldAlert size={14} /> Initializing Crypto...
               </span>
             )}
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
         {children}
      </main>
    </div>
  )
}
