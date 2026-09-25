import React, { useState } from 'react';
import { ArrowRight, LockKeyhole, UserPlus, Building2, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface LoginViewProps {
  onAuthSuccess: (message: string) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onAuthSuccess }) => {
  const { login: authLogin, register: authRegister, workspaces, activeWorkspaceId, selectWorkspace, isAuthenticated, isLoading } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleBackendLogin = async (userEmail: string, userPassword: string) => {
    setIsSubmitting(true);
    setError('');
    try {
      await authLogin(userEmail.trim(), userPassword);
      onAuthSuccess('Signed in successfully. Welcome back!');
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Unable to sign in with the server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackendRegister = async (name: string, userEmail: string, userPassword: string, userWorkspaceName: string) => {
    setIsSubmitting(true);
    setError('');
    try {
      await authRegister(name.trim(), userEmail.trim(), userPassword, userWorkspaceName.trim());
      onAuthSuccess('Account created and signed in successfully!');
    } catch (registerError) {
      setError(registerError instanceof Error ? registerError.message : 'Unable to create the account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!email.trim()) {
      setError('Email is required.');
      return;
    }
    if (!password.trim()) {
      setError('Password is required.');
      return;
    }
    await handleBackendLogin(email.trim(), password);
  };

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (password.length < 4) { setError('Use a password with at least 4 characters.'); return; }
    if (!fullName.trim() || !email.trim() || !workspaceName.trim()) { setError('Full name, email, and workspace name are required.'); return; }
    await handleBackendRegister(fullName, email.trim(), password, workspaceName.trim());
  };

  const handleWorkspaceSelect = async (workspaceId: string) => {
    selectWorkspace(workspaceId);
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading...</span>
        </div>
      </main>
    );
  }

  if (isAuthenticated && activeWorkspaceId) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-slate-600">Redirecting to workspace...</p>
        </div>
      </main>
    );
  }

  if (isAuthenticated && workspaces.length > 0) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <section className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-slate-950 px-6 py-8 flex justify-center">
            <img src="/img/logo.png" alt="ChaChing Accounting" className="w-full max-w-[220px] rounded-lg bg-white p-1" />
          </div>
          <div className="p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <h1 className="text-lg font-bold text-slate-900">Select Your Workspace</h1>
            </div>
            <p className="text-xs text-slate-500 mb-6">Choose a workspace to continue.</p>
            <div className="space-y-2">
              {workspaces.map((ws) => (
                <button
                  key={ws._id}
                  onClick={() => handleWorkspaceSelect(ws._id)}
                  className="w-full text-left px-4 py-3 border border-slate-200 rounded-lg hover:bg-emerald-50 hover:border-emerald-300 transition-colors cursor-pointer"
                >
                  <p className="text-sm font-semibold text-slate-900">{ws.name}</p>
                  <p className="text-xs text-slate-500">{ws.settings?.businessName || ws.name}</p>
                </button>
              ))}
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <section className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-slate-950 px-6 py-8 flex justify-center">
          <img src="/img/logo.png" alt="ChaChing Accounting & Financial System" className="w-full max-w-[220px] rounded-lg bg-white p-1" />
        </div>
        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-1">
            {mode === 'login' ? <LockKeyhole className="w-4 h-4 text-emerald-600" /> : <UserPlus className="w-4 h-4 text-emerald-600" />}
            <h1 className="text-lg font-bold text-slate-900">{mode === 'login' ? 'Sign in to your workspace' : 'Create admin account'}</h1>
          </div>
          <p className="text-xs text-slate-500 mb-6">{mode === 'login' ? 'Choose the accounting workspace you want to manage.' : 'Each account starts with its own separate accounting data.'}</p>

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@email.com" className="w-full text-sm px-3 py-2.5 border border-slate-300 rounded-lg" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" className="w-full text-sm px-3 py-2.5 border border-slate-300 rounded-lg" required />
              </div>
              {error && <p className="text-xs text-rose-600">{error}</p>}
              <button type="submit" disabled={isSubmitting} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold cursor-pointer disabled:opacity-50">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Sign in <ArrowRight className="w-4 h-4" /></>}
              </button>
              <button type="button" onClick={() => { setMode('register'); setError(''); setPassword(''); }} className="w-full text-xs font-semibold text-slate-600 hover:text-emerald-700 cursor-pointer">Create another admin account</button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full name</label>
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Juan Dela Cruz" className="w-full text-sm px-3 py-2.5 border border-slate-300 rounded-lg" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Workspace name</label>
                <input type="text" value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} placeholder="ChaChing Accounting" className="w-full text-sm px-3 py-2.5 border border-slate-300 rounded-lg" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@email.com" className="w-full text-sm px-3 py-2.5 border border-slate-300 rounded-lg" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 4 characters" className="w-full text-sm px-3 py-2.5 border border-slate-300 rounded-lg" minLength={4} required />
              </div>
              {error && <p className="text-xs text-rose-600">{error}</p>}
              <button type="submit" disabled={isSubmitting} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold cursor-pointer disabled:opacity-50">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Create account <ArrowRight className="w-4 h-4" /></>}
              </button>
              <button type="button" onClick={() => { setMode('login'); setError(''); setPassword(''); }} className="w-full text-xs font-semibold text-slate-600 hover:text-emerald-700 cursor-pointer">Back to sign in</button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
};
