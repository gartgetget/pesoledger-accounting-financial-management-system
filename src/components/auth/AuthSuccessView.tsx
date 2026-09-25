import React, { useEffect } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';

interface AuthSuccessViewProps {
  message: string;
  onDone: () => void;
}

export const AuthSuccessView: React.FC<AuthSuccessViewProps> = ({ message, onDone }) => {
  useEffect(() => {
    const timer = setTimeout(onDone, 1400);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-xl p-8 text-center animate-in fade-in zoom-in-95 duration-300">
        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
        <h1 className="mt-4 text-base font-bold text-slate-900">{message}</h1>
        <div className="mt-2 flex items-center justify-center gap-2 text-xs text-slate-500">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Preparing your workspace…</span>
        </div>
      </div>
    </main>
  );
};
