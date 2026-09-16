import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Lock, Mail, ShieldAlert, ArrowRight, UserCheck } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@fundsroom.com');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await api.post('/auth/login', { email, password });
      login(res.data.token, res.data.user);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const setRoleCredentials = (role: 'ADMIN' | 'SALES') => {
    if (role === 'ADMIN') {
      setEmail('admin@fundsroom.com');
    } else {
      setEmail('sales@fundsroom.com');
    }
    setPassword('password123');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-500/20">
            <Lock className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-3xl font-extrabold text-white tracking-tight">
          FundsRoom Mini ERP
        </h2>
        <p className="mt-1 text-center text-sm text-slate-400">
          Manufacturing & Distribution Operations Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900 py-8 px-6 shadow-2xl rounded-xl sm:px-10 border border-slate-800">
          {error && (
            <div className="mb-4 bg-rose-950/80 border border-rose-800 text-rose-200 text-sm p-3 rounded-lg flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 flex-shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-slate-300">Work Email</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="name@fundsroom.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300">Password</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : (
                  <>
                    <span>Sign In to Portal</span>
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Login Role Shortcuts */}
          <div className="mt-6 pt-6 border-t border-slate-800">
            <p className="text-xs text-center text-slate-400 mb-3 font-medium uppercase tracking-wider">
              Quick 1-Click Evaluation Accounts
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRoleCredentials('ADMIN')}
                className="flex items-center justify-center space-x-1.5 py-2 px-3 bg-purple-950/60 border border-purple-800/80 rounded-lg text-xs font-semibold text-purple-200 hover:bg-purple-900/60 transition"
              >
                <UserCheck className="w-3.5 h-3.5 text-purple-400" />
                <span>Admin Login</span>
              </button>
              <button
                type="button"
                onClick={() => setRoleCredentials('SALES')}
                className="flex items-center justify-center space-x-1.5 py-2 px-3 bg-emerald-950/60 border border-emerald-800/80 rounded-lg text-xs font-semibold text-emerald-200 hover:bg-emerald-900/60 transition"
              >
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Sales Login</span>
              </button>
            </div>
            <p className="text-[11px] text-center text-slate-500 mt-2">
              Default password: <code className="text-slate-400 bg-slate-950 px-1 py-0.5 rounded">password123</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
