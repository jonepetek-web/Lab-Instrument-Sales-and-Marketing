import { CalendarClock, CheckCircle2, Plus, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  CUSTOMER_TYPES,
  PIPELINE_STAGES,
  type Customer,
  type CustomerType,
  type Opportunity,
  type PipelineStage,
} from '../types/platform.ts';
import { apiFetch } from '../utils/api.ts';

export function CrmPipelineView() {
  const [tab, setTab] = useState<'pipeline' | 'customers'>('pipeline');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [showNewDeal, setShowNewDeal] = useState(false);
  const [followUpNote, setFollowUpNote] = useState('');
  const [followUpDate, setFollowUpDate] = useState('2026-11-28');

  const [newCustomer, setNewCustomer] = useState({
    institutionName: '',
    type: CUSTOMER_TYPES[0] as CustomerType,
    country: '',
    city: '',
    department: '',
    contactName: '',
    contactTitle: '',
    contactEmail: '',
    contactPhone: '',
    researchInterests: '',
    instrumentRequirements: '',
    potentialValue: 85000,
  });

  const [newDeal, setNewDeal] = useState({
    title: '',
    customerId: '',
    value: 65000,
    stage: 'New Lead' as PipelineStage,
    expectedCloseDate: '2027-01-31',
    notes: '',
  });

  async function loadAll() {
    const [custs, opps] = await Promise.all([
      apiFetch<Customer[]>('/api/customers'),
      apiFetch<Opportunity[]>('/api/opportunities'),
    ]);
    setCustomers(custs);
    setOpportunities(opps);
    if (custs[0] && !newDeal.customerId) {
      setNewDeal((d) => ({ ...d, customerId: custs[0].id }));
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter((c) => {
      const matchType = typeFilter === 'All' || c.type === typeFilter;
      const matchQ =
        !q ||
        c.institutionName.toLowerCase().includes(q) ||
        c.country.toLowerCase().includes(q) ||
        c.department.toLowerCase().includes(q) ||
        c.instrumentRequirements.toLowerCase().includes(q);
      return matchType && matchQ;
    });
  }, [customers, typeFilter, search]);

  async function moveStage(oppId: string, stage: PipelineStage) {
    const updated = await apiFetch<Opportunity>(`/api/opportunities/${oppId}`, {
      method: 'PATCH',
      body: JSON.stringify({ stage }),
    });
    setOpportunities((prev) => prev.map((o) => (o.id === oppId ? updated : o)));
  }

  async function handleAddCustomer(e: React.FormEvent) {
    e.preventDefault();
    await apiFetch('/api/customers', {
      method: 'POST',
      body: JSON.stringify({
        institutionName: newCustomer.institutionName,
        type: newCustomer.type,
        country: newCustomer.country,
        city: newCustomer.city,
        department: newCustomer.department,
        contacts: newCustomer.contactName
          ? [
              {
                name: newCustomer.contactName,
                title: newCustomer.contactTitle || 'Lab Lead',
                email: newCustomer.contactEmail,
                phone: newCustomer.contactPhone,
              },
            ]
          : [],
        researchInterests: newCustomer.researchInterests,
        instrumentRequirements: newCustomer.instrumentRequirements,
        potentialValue: newCustomer.potentialValue,
      }),
    });
    setShowNewCustomer(false);
    loadAll();
  }

  async function handleAddDeal(e: React.FormEvent) {
    e.preventDefault();
    const cust = customers.find((c) => c.id === newDeal.customerId);
    await apiFetch('/api/opportunities', {
      method: 'POST',
      body: JSON.stringify({
        ...newDeal,
        customerName: cust?.institutionName || 'Laboratory Client',
        customerType: cust?.type || 'Research Institutions',
      }),
    });
    setShowNewDeal(false);
    loadAll();
  }

  async function handleAddFollowUp(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCustomer || !followUpNote) return;
    const updated = await apiFetch<Customer>(`/api/customers/${selectedCustomer.id}/followups`, {
      method: 'POST',
      body: JSON.stringify({ dueDate: followUpDate, note: followUpNote }),
    });
    setSelectedCustomer(updated);
    setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setFollowUpNote('');
  }

  async function toggleFollowUp(custId: string, fuId: string, completed: boolean) {
    const updated = await apiFetch<Customer>(`/api/customers/${custId}/followups/${fuId}`, {
      method: 'PATCH',
      body: JSON.stringify({ completed }),
    });
    setSelectedCustomer(updated);
    setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Sales CRM & 10-Stage Pipeline</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Institutional laboratories database across 10 sectors · Stage progression, follow-up reminders, and account history.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-md">
            <button
              type="button"
              onClick={() => setTab('pipeline')}
              className={`px-3 py-1.5 text-xs font-medium rounded ${
                tab === 'pipeline'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              10-Stage Pipeline ({opportunities.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('customers')}
              className={`px-3 py-1.5 text-xs font-medium rounded ${
                tab === 'customers'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Customer Directory ({customers.length})
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowNewDeal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-cyan-700 text-white rounded-md hover:bg-cyan-800"
          >
            <Plus className="w-3.5 h-3.5" /> New Deal
          </button>
          <button
            type="button"
            onClick={() => setShowNewCustomer(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <Plus className="w-3.5 h-3.5" /> Add Account
          </button>
        </div>
      </div>

      {tab === 'pipeline' ? (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-3.5 min-w-max">
            {PIPELINE_STAGES.map((stage) => {
              const items = opportunities.filter((o) => o.stage === stage);
              const stageSum = items.reduce((s, o) => s + o.value, 0);
              return (
                <div
                  key={stage}
                  className="w-72 shrink-0 bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg p-3 flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                    <div>
                      <div className="text-xs font-display font-semibold text-slate-900 dark:text-white">
                        {stage}
                      </div>
                      <div className="text-[11px] font-mono tabular-nums text-slate-500">
                        {items.length} deals · ${stageSum.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {items.map((opp) => (
                      <div
                        key={opp.id}
                        className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md space-y-2"
                      >
                        <div className="text-xs font-semibold text-slate-900 dark:text-white leading-snug">
                          {opp.title}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {opp.customerName} · {opp.customerType}
                        </div>
                        <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                          <span className="font-semibold text-cyan-700 dark:text-cyan-400">
                            ${opp.value.toLocaleString()}
                          </span>
                          <span className="text-slate-500">{opp.probability}%</span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Rep: {opp.assignedSalespersonName} · Close: {opp.expectedCloseDate}
                        </div>
                        <select
                          value={opp.stage}
                          onChange={(e) => moveStage(opp.id, e.target.value as PipelineStage)}
                          className="w-full px-2 py-1 text-[11px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded"
                        >
                          {PIPELINE_STAGES.map((st) => (
                            <option key={st} value={st}>
                              Move to: {st}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                    {items.length === 0 && (
                      <div className="text-[11px] text-slate-400 text-center py-6">No deals in stage</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search institution, country, department, or instrument requirement..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md"
            >
              <option value="All">All 10 Institutional Types ({customers.length})</option>
              {CUSTOMER_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50 dark:bg-slate-950/60">
                  <th className="text-left py-3 px-4 font-semibold">Institution & Department</th>
                  <th className="text-left py-3 px-3 font-semibold">Sector & Location</th>
                  <th className="text-left py-3 px-3 font-semibold">Primary Contact</th>
                  <th className="text-right py-3 px-3 font-semibold">Potential Value</th>
                  <th className="text-left py-3 px-3 font-semibold">Assigned Rep</th>
                  <th className="text-right py-3 px-4 font-semibold">Profile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">{c.institutionName}</div>
                      <div className="text-[11px] text-slate-500">{c.department}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div>{c.type}</div>
                      <div className="text-[11px] text-slate-500">{c.city}, {c.country}</div>
                    </td>
                    <td className="py-3 px-3">
                      {c.contacts[0] ? (
                        <div>
                          <div className="font-medium">{c.contacts[0].name}</div>
                          <div className="text-[11px] text-slate-500">{c.contacts[0].title}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400">No contact logged</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-semibold tabular-nums">
                      ${c.potentialValue.toLocaleString()}
                    </td>
                    <td className="py-3 px-3">{c.assignedSalespersonName}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedCustomer(c)}
                        className="px-3 py-1.5 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        360° Profile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Customer 360 Drawer */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex justify-end">
          <div className="bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 w-full max-w-xl h-full overflow-y-auto p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-cyan-700 dark:text-cyan-400 font-medium">
                  {selectedCustomer.type} · {selectedCustomer.city}, {selectedCustomer.country}
                </div>
                <h2 className="text-xl font-display font-bold mt-1">{selectedCustomer.institutionName}</h2>
                <div className="text-xs text-slate-500 mt-0.5">{selectedCustomer.department}</div>
              </div>
              <button type="button" onClick={() => setSelectedCustomer(null)}>
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="text-xs space-y-3 border-t border-b border-slate-200 dark:border-slate-800 py-4">
              <div>
                <span className="font-semibold">Research Interests:</span> {selectedCustomer.researchInterests || 'N/A'}
              </div>
              <div>
                <span className="font-semibold">Instrument Requirements:</span> {selectedCustomer.instrumentRequirements || 'N/A'}
              </div>
              <div>
                <span className="font-semibold">Existing Installed Base:</span>{' '}
                {selectedCustomer.existingInstruments.join(', ') || 'None recorded'}
              </div>
              <div>
                <span className="font-semibold">Estimated Account Potential:</span>{' '}
                <span className="font-mono font-semibold">${selectedCustomer.potentialValue.toLocaleString()}</span>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-mono uppercase text-slate-500 mb-2">Contacts</h3>
              <div className="space-y-2 text-xs">
                {selectedCustomer.contacts.map((ct, i) => (
                  <div key={i} className="p-2.5 border border-slate-200 dark:border-slate-800 rounded-md">
                    <div className="font-semibold">{ct.name} · {ct.title}</div>
                    <div className="text-slate-500 font-mono mt-0.5">{ct.email} · {ct.phone}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-mono uppercase text-slate-500 mb-2">Purchasing History</h3>
              {selectedCustomer.purchasingHistory.length === 0 ? (
                <div className="text-xs text-slate-400">No historical orders yet.</div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {selectedCustomer.purchasingHistory.map((h, i) => (
                    <div key={i} className="py-2 flex justify-between">
                      <div>
                        <div className="font-mono font-medium">{h.orderRef} · {h.date}</div>
                        <div className="text-slate-500">{h.itemsSummary}</div>
                      </div>
                      <div className="font-mono font-semibold tabular-nums">${h.amount.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-xs font-mono uppercase text-slate-500 mb-2 flex items-center gap-1.5">
                <CalendarClock className="w-3.5 h-3.5" /> Follow-Up Reminders & Scheduling
              </h3>
              <form onSubmit={handleAddFollowUp} className="flex gap-2 mb-3">
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md font-mono"
                />
                <input
                  type="text"
                  required
                  value={followUpNote}
                  onChange={(e) => setFollowUpNote(e.target.value)}
                  placeholder="Next action reminder..."
                  className="flex-1 px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md"
                />
                <button type="submit" className="px-3 py-1.5 text-xs font-semibold bg-cyan-700 text-white rounded-md">
                  Schedule
                </button>
              </form>

              <div className="space-y-2 text-xs">
                {selectedCustomer.followUps.map((fu) => (
                  <div
                    key={fu.id}
                    className="p-2.5 border border-slate-200 dark:border-slate-800 rounded-md flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className={fu.completed ? 'line-through text-slate-400' : 'font-medium'}>
                        {fu.note}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        Due: {fu.dueDate} · {fu.ownerName}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleFollowUp(selectedCustomer.id, fu.id, !fu.completed)}
                      className={`p-1 rounded ${fu.completed ? 'text-emerald-600' : 'text-slate-400 hover:text-emerald-600'}`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Customer Modal */}
      {showNewCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <form
            onSubmit={handleAddCustomer}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-xl w-full p-6 space-y-3 text-xs"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-display font-bold">Add Institutional Customer</h3>
              <button type="button" onClick={() => setShowNewCustomer(false)}><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block font-medium mb-1">Institution / Company Name *</label>
                <input required value={newCustomer.institutionName} onChange={(e) => setNewCustomer({ ...newCustomer, institutionName: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md" />
              </div>
              <div>
                <label className="block font-medium mb-1">Laboratory Sector *</label>
                <select value={newCustomer.type} onChange={(e) => setNewCustomer({ ...newCustomer, type: e.target.value as CustomerType })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md">
                  {CUSTOMER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-medium mb-1">Department</label>
                <input value={newCustomer.department} onChange={(e) => setNewCustomer({ ...newCustomer, department: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md" />
              </div>
              <div>
                <label className="block font-medium mb-1">Country</label>
                <input value={newCustomer.country} onChange={(e) => setNewCustomer({ ...newCustomer, country: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md" />
              </div>
              <div>
                <label className="block font-medium mb-1">City</label>
                <input value={newCustomer.city} onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md" />
              </div>
              <div>
                <label className="block font-medium mb-1">Primary Contact Name</label>
                <input value={newCustomer.contactName} onChange={(e) => setNewCustomer({ ...newCustomer, contactName: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md" />
              </div>
              <div>
                <label className="block font-medium mb-1">Contact Email</label>
                <input type="email" value={newCustomer.contactEmail} onChange={(e) => setNewCustomer({ ...newCustomer, contactEmail: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md" />
              </div>
              <div className="col-span-2">
                <label className="block font-medium mb-1">Instrument Requirements</label>
                <input value={newCustomer.instrumentRequirements} onChange={(e) => setNewCustomer({ ...newCustomer, instrumentRequirements: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3">
              <button type="button" onClick={() => setShowNewCustomer(false)} className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-md">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-cyan-700 text-white font-semibold rounded-md">Save Account</button>
            </div>
          </form>
        </div>
      )}

      {/* New Opportunity Modal */}
      {showNewDeal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <form
            onSubmit={handleAddDeal}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-md w-full p-6 space-y-3 text-xs"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-display font-bold">New Pipeline Opportunity</h3>
              <button type="button" onClick={() => setShowNewDeal(false)}><X className="w-4 h-4" /></button>
            </div>
            <div>
              <label className="block font-medium mb-1">Opportunity Title *</label>
              <input required value={newDeal.title} onChange={(e) => setNewDeal({ ...newDeal, title: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md" />
            </div>
            <div>
              <label className="block font-medium mb-1">Account *</label>
              <select value={newDeal.customerId} onChange={(e) => setNewDeal({ ...newDeal, customerId: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md">
                {customers.map((c) => <option key={c.id} value={c.id}>{c.institutionName}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium mb-1">Estimated Value (USD)</label>
                <input type="number" value={newDeal.value} onChange={(e) => setNewDeal({ ...newDeal, value: Number(e.target.value) })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md font-mono" />
              </div>
              <div>
                <label className="block font-medium mb-1">Initial Stage</label>
                <select value={newDeal.stage} onChange={(e) => setNewDeal({ ...newDeal, stage: e.target.value as PipelineStage })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md">
                  {PIPELINE_STAGES.map((st) => <option key={st} value={st}>{st}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block font-medium mb-1">Notes</label>
              <textarea rows={2} value={newDeal.notes} onChange={(e) => setNewDeal({ ...newDeal, notes: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md" />
            </div>
            <div className="flex justify-end gap-2 pt-3">
              <button type="button" onClick={() => setShowNewDeal(false)} className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-md">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-cyan-700 text-white font-semibold rounded-md">Create Deal</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
