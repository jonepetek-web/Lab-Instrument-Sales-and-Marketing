import { Lock, Shield, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { UserAccount } from '../types/platform.ts';
import { apiFetch, setStoredToken } from '../utils/api.ts';

interface LoginModalProps {
  onClose: () => void;
  onAuthenticated: (user: UserAccount) => void;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin · Full Access & Cost Visibility',
  sales_manager: 'Sales Manager · Approvals & Cost Visibility',
  sales_rep: 'Sales Rep · CRM, Quotes & AI Tools',
  marketing: 'Marketing · Campaigns & AI Content',
  procurement: 'Procurement · Inventory & POs',
  service_engineer: 'Service Engineer · IQ/OQ & Repairs',
};

export function LoginModal({ onClose, onAuthenticated }: LoginModalProps) {
  const [demoAccounts, setDemoAccounts] = useState<UserAccount[]>([]);
  const [email, setEmail] = useState('elena.rostova@heliosanalytical.com');
  const [password, setPassword] = useState('HeliosLab2026!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<UserAccount[]>('/api/auth/demo-accounts')
      .then(setDemoAccounts)
      .catch(() => {});
  }, []);

  async function handleCredentialLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch<{ token: string; user: UserAccount }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setStoredToken(res.token);
      onAuthenticated(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRoleQuickSignIn(userId: string) {
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch<{ token: string; user: UserAccount }>('/api/auth/role-switch', {
        method: 'POST',
        body: JSON.stringify({ userId }),
      });
      setStoredToken(res.token);
      onAuthenticated(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to switch role.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-2xl w-full max-h-[92vh] overflow-y-auto p-6 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase text-cyan-700 dark:text-cyan-400">
              <Lock className="w-3.5 h-3.5" /> Role-Based Workspace Access
            </div>
            <h2 className="text-xl font-display font-bold mt-1">
              Helios Analytical Commercial & Operations Portal
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleCredentialLogin} className="space-y-3 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Corporate Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md"
              />
            </div>
          </div>

          {error && (
            <div className="p-2.5 text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-md">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold bg-cyan-700 hover:bg-cyan-800 text-white rounded-md transition-colors disabled:opacity-60"
          >
            {loading ? 'Authenticating...' : 'Sign In with Credentials'}
          </button>
        </form>

        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400 mb-3">
            <Shield className="w-3.5 h-3.5 text-cyan-700 dark:text-cyan-400" />
            Quick Role Access (Verify Role-Based Permissions & Cost Visibility)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {demoAccounts.map((acc) => (
              <button
                key={acc.id}
                type="button"
                disabled={loading}
                onClick={() => handleRoleQuickSignIn(acc.id)}
                className="text-left p-3 border border-slate-200 dark:border-slate-800 rounded-md hover:border-cyan-600 dark:hover:border-cyan-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">{acc.name}</span>
                  <span className="text-[11px] font-mono text-slate-500">{acc.avatarInitials}</span>
                </div>
                <div className="text-xs text-cyan-700 dark:text-cyan-400 mt-0.5">
                  {ROLE_LABELS[acc.role] || acc.title}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  {acc.email}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
