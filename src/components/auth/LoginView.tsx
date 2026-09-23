import React, { useState } from 'react';
import { ArrowRight, LockKeyhole, UserPlus } from 'lucide-react';
import { useAccounting } from '../../context/AccountingContext';

export const LoginView: React.FC = () => {
  const { accounts, login, createAccount } = useAccounting();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [accountName, setAccountName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const selectedAccount = accounts.find((account) => account.id === accountId);

  const handleLogin = (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!login(accountId, password)) {
      setError('Account name or password is incorrect.');
    }
  };

  const handleRegister = (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (password.length < 4) {
      setError('Use a password with at least 4 characters.');
      return;
    }
    createAccount(accountName, password);
  };

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <section className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-slate-950 px-6 py-8 flex justify-center">
          <img
            src="/img/logo.png"
            alt="ChaChing Accounting & Financial System"
            className="w-full max-w-[220px] rounded-lg bg-white p-1"
          />
        </div>

        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-1">
            {mode === 'login' ? <LockKeyhole className="w-4 h-4 text-emerald-600" /> : <UserPlus className="w-4 h-4 text-emerald-600" />}
            <h1 className="text-lg font-bold text-slate-900">
              {mode === 'login' ? 'Sign in to your workspace' : 'Create admin account'}
            </h1>
          </div>
          <p className="text-xs text-slate-500 mb-6">
            {mode === 'login'
              ? 'Choose the accounting workspace you want to manage.'
              : 'Each account starts with its own separate accounting data.'}
          </p>

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Admin account</label>
                <select
                  value={accountId}
                  onChange={(event) => setAccountId(event.target.value)}
                  className="w-full text-sm px-3 py-2.5 border border-slate-300 rounded-lg bg-white"
                  required
                >
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>{account.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={selectedAccount?.password ? 'Enter password' : 'No password set'}
                  className="w-full text-sm px-3 py-2.5 border border-slate-300 rounded-lg"
                />
              </div>
              {error && <p className="text-xs text-rose-600">{error}</p>}
              <button type="submit" className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold cursor-pointer">
                Sign in <ArrowRight className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => { setMode('register'); setError(''); setPassword(''); }} className="w-full text-xs font-semibold text-slate-600 hover:text-emerald-700 cursor-pointer">
                Create another admin account
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Account name</label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(event) => setAccountName(event.target.value)}
                  placeholder="e.g. Branch 2 Admin"
                  className="w-full text-sm px-3 py-2.5 border border-slate-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 4 characters"
                  className="w-full text-sm px-3 py-2.5 border border-slate-300 rounded-lg"
                  minLength={4}
                  required
                />
              </div>
              {error && <p className="text-xs text-rose-600">{error}</p>}
              <button type="submit" className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold cursor-pointer">
                Create account <ArrowRight className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => { setMode('login'); setError(''); setPassword(''); }} className="w-full text-xs font-semibold text-slate-600 hover:text-emerald-700 cursor-pointer">
                Back to sign in
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
};
