import { ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { UserAccount } from '../types/platform.ts';
import { apiFetch } from '../utils/api.ts';

const RBAC_MATRIX = [
  { role: 'admin', label: 'Managing Director (Admin)', costPrice: 'Full Access', approvals: 'Quotes, POs, Marketing', adminSettings: 'Yes' },
  { role: 'sales_manager', label: 'VP Commercial (Sales Manager)', costPrice: 'Full Access', approvals: 'Quotes, Marketing', adminSettings: 'Limited' },
  { role: 'sales_rep', label: 'Sales Representative', costPrice: 'Restricted', approvals: 'Submit Drafts Only', adminSettings: 'No' },
  { role: 'marketing', label: 'Marketing Specialist', costPrice: 'Restricted', approvals: 'Approve Marketing', adminSettings: 'No' },
  { role: 'procurement', label: 'Procurement & Inventory', costPrice: 'Restricted', approvals: 'Approve & Receive POs', adminSettings: 'No' },
  { role: 'service_engineer', label: 'Field Service Engineer', costPrice: 'Restricted', approvals: 'IQ/OQ & Service Tickets', adminSettings: 'No' },
];

export function AdminTeamView({ currentUser }: { currentUser: UserAccount }) {
  const [users, setUsers] = useState<UserAccount[]>([]);

  useEffect(() => {
    apiFetch<{ users: UserAccount[] }>('/api/operations')
      .then((res) => setUsers(res.users))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Role-Based Access & Team Governance</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Server-enforced permissions for restricted cost pricing, quotation approvals, procurement, and marketing publication gates.
        </p>
      </div>

      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-x-auto">
        <div className="flex items-center gap-2 text-sm font-display font-semibold mb-3">
          <ShieldCheck className="w-4 h-4 text-cyan-700 dark:text-cyan-400" />
          Active Role Permissions Matrix (Signed In As: {currentUser.name} · {currentUser.role})
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
              <th className="text-left py-2.5 px-3">Role</th>
              <th className="text-left py-2.5 px-3">Product Cost Price Access</th>
              <th className="text-left py-2.5 px-3">Workflow Approvals</th>
              <th className="text-left py-2.5 px-3">System Admin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {RBAC_MATRIX.map((r) => (
              <tr
                key={r.role}
                className={currentUser.role === r.role ? 'bg-cyan-50/70 dark:bg-cyan-950/30 font-semibold' : ''}
              >
                <td className="py-2.5 px-3">{r.label}</td>
                <td className="py-2.5 px-3 font-mono">{r.costPrice}</td>
                <td className="py-2.5 px-3">{r.approvals}</td>
                <td className="py-2.5 px-3 font-mono">{r.adminSettings}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((u) => (
          <div
            key={u.id}
            className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-md bg-slate-900 text-white dark:bg-slate-800 flex items-center justify-center font-mono font-bold shrink-0">
              {u.avatarInitials}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-sm truncate">{u.name}</div>
              <div className="text-cyan-700 dark:text-cyan-400 truncate">{u.title}</div>
              <div className="text-slate-500 truncate">{u.email} · {u.territory}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
