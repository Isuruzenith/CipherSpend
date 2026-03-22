import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCrypto } from '../../context/CryptoContext';
import { ShieldCheck, ShieldAlert, Settings as SettingsIcon } from 'lucide-react';

export const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isCryptoReady } = useCrypto();
  const { pathname } = useLocation();
  const isSettingsPage = pathname === '/settings';

  return (
    <div className="min-h-screen bg-zinc-950 text-gray-200 flex flex-col">
      <header className="border-b border-zinc-800 bg-zinc-950/80 sticky top-0 z-10 transition-colors duration-300">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <Link to="/dashboard" className="flex items-center gap-3 group">
               <img src="/favicon-32x32.png" alt="CipherSpend logo" className="w-8 h-8 rounded-sm" />
                <span className="font-bold text-lg tracking-tight text-white group-hover:text-teal-300 transition-colors">CipherSpend</span>
              </Link>
          </div>
          <div className="flex items-center gap-3 text-sm">
             {!isSettingsPage && (
               <Link to="/settings" className="p-1.5 hover:bg-zinc-800 rounded-md transition-colors text-zinc-400 hover:text-white">
                  <SettingsIcon size={18} />
               </Link>
             )}
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
