import { CheckCircle, Download, Plus, Send, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type {
  Customer,
  Product,
  Quotation,
  QuotationLineItem,
  QuotationStatus,
  QuotationTemplate,
  UserAccount,
} from '../types/platform.ts';
import { apiFetch } from '../utils/api.ts';
import { exportQuotationPDF } from '../utils/exporters.ts';

const TEMPLATES: QuotationTemplate[] = [
  'Laboratory Instruments',
  'Complete Laboratory Project',
  'Turnkey Laboratory Solution',
  'Consumables and Reagents',
  'Service Contract',
];

export function QuotationsView({ currentUser }: { currentUser: UserAccount }) {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showBuilder, setShowBuilder] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Builder State
  const [templateType, setTemplateType] = useState<QuotationTemplate>('Laboratory Instruments');
  const [customerId, setCustomerId] = useState('');
  const [taxRate, setTaxRate] = useState(8.1);
  const [deliveryTerms, setDeliveryTerms] = useState('CIP Destination (Incoterms 2020) — 3 Weeks ARO');
  const [paymentTerms, setPaymentTerms] = useState('50% Advance, 50% Upon Delivery');
  const [warrantyTerms, setWarrantyTerms] = useState('24 Months Comprehensive OEM Warranty');
  const [installationTraining, setInstallationTraining] = useState(
    'On-Site IQ/OQ Calibration & 2-Day Operator Training Included'
  );
  const [validityDays, setValidityDays] = useState(30);
  const [items, setItems] = useState<QuotationLineItem[]>([]);

  const canApprove = ['admin', 'sales_manager'].includes(currentUser.role);

  async function loadAll() {
    const [qts, custs, prods] = await Promise.all([
      apiFetch<Quotation[]>('/api/quotations'),
      apiFetch<Customer[]>('/api/customers'),
      apiFetch<Product[]>('/api/products'),
    ]);
    setQuotations(qts);
    setCustomers(custs);
    setProducts(prods);
    if (custs[0] && !customerId) setCustomerId(custs[0].id);
  }

  useEffect(() => {
    loadAll();
  }, []);

  function addLineItem(productId: string) {
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    const specsSummary = Object.entries(p.specs)
      .slice(0, 3)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
    setItems((prev) => [
      ...prev,
      {
        productId: p.id,
        productName: p.name,
        modelNumber: p.modelNumber,
        manufacturer: p.manufacturer,
        specsSummary,
        quantity: 1,
        unitPrice: p.sellingPrice,
        discountPercent: 0,
        lineTotal: p.sellingPrice,
      },
    ]);
  }

  function updateItem(idx: number, field: 'quantity' | 'discountPercent', val: number) {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it;
        const qty = field === 'quantity' ? Math.max(1, val) : it.quantity;
        const disc = field === 'discountPercent' ? Math.min(50, Math.max(0, val)) : it.discountPercent;
        const lineTotal = Math.round(qty * it.unitPrice * (1 - disc / 100));
        return { ...it, quantity: qty, discountPercent: disc, lineTotal };
      })
    );
  }

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const netTotal = items.reduce((s, i) => s + i.lineTotal, 0);
  const discountAmount = subtotal - netTotal;
  const taxAmount = Math.round((netTotal * taxRate) / 100);
  const totalAmount = netTotal + taxAmount;

  async function handleCreateQuotation(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) {
      setError('Add at least one instrument line item.');
      return;
    }
    const cust = customers.find((c) => c.id === customerId);
    await apiFetch('/api/quotations', {
      method: 'POST',
      body: JSON.stringify({
        templateType,
        customerId,
        customerName: cust?.institutionName || 'Laboratory Client',
        customerContact: cust?.contacts[0]?.name || 'Procurement Desk',
        customerEmail: cust?.contacts[0]?.email || '',
        customerLocation: cust ? `${cust.city}, ${cust.country}` : '',
        items,
        subtotal,
        discountAmount,
        taxRate,
        taxAmount,
        totalAmount,
        deliveryTerms,
        paymentTerms,
        warrantyTerms,
        installationTraining,
        validityDays,
      }),
    });
    setShowBuilder(false);
    setItems([]);
    setError(null);
    loadAll();
  }

  async function updateStatus(id: string, status: QuotationStatus) {
    setError(null);
    try {
      const updated = await apiFetch<Quotation>(`/api/quotations/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setQuotations((prev) => prev.map((q) => (q.id === id ? updated : q)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Status update denied.');
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Quotation & Proposal Generator</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            5 commercial templates, VAT & discount calculations, manager approval workflow, and downloadable PDF quotations.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowBuilder(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-cyan-700 hover:bg-cyan-800 text-white rounded-md shrink-0"
        >
          <Plus className="w-4 h-4" /> Create Quotation
        </button>
      </div>

      {error && (
        <div className="p-3 text-xs bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-md">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50 dark:bg-slate-950/60">
              <th className="text-left py-3 px-4 font-semibold">Quote # & Template</th>
              <th className="text-left py-3 px-3 font-semibold">Customer</th>
              <th className="text-right py-3 px-3 font-semibold">Items</th>
              <th className="text-right py-3 px-3 font-semibold">Total Value</th>
              <th className="text-left py-3 px-3 font-semibold">Workflow Status</th>
              <th className="text-right py-3 px-4 font-semibold">Actions & PDF</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {quotations.map((qt) => (
              <tr key={qt.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="py-3 px-4">
                  <div className="font-mono font-semibold text-slate-900 dark:text-white">{qt.quoteNumber}</div>
                  <div className="text-[11px] text-slate-500">{qt.templateType} · {qt.createdAt}</div>
                </td>
                <td className="py-3 px-3">
                  <div className="font-medium">{qt.customerName}</div>
                  <div className="text-[11px] text-slate-500">{qt.customerContact} · {qt.customerLocation}</div>
                </td>
                <td className="py-3 px-3 text-right font-mono tabular-nums">{qt.items.length}</td>
                <td className="py-3 px-3 text-right font-mono font-semibold tabular-nums">
                  ${qt.totalAmount.toLocaleString()}
                </td>
                <td className="py-3 px-3">
                  <div
                    className={`font-medium ${
                      qt.status === 'Approved' || qt.status === 'Accepted'
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : qt.status === 'Pending Approval'
                        ? 'text-amber-700 dark:text-amber-400'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {qt.status}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    By {qt.createdBy} {qt.approvedBy ? `· App: ${qt.approvedBy}` : ''}
                  </div>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="inline-flex items-center gap-1.5">
                    {qt.status === 'Draft' && (
                      <button
                        type="button"
                        onClick={() => updateStatus(qt.id, 'Pending Approval')}
                        className="px-2.5 py-1 text-[11px] font-medium border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        Submit Approval
                      </button>
                    )}
                    {qt.status === 'Pending Approval' && canApprove && (
                      <button
                        type="button"
                        onClick={() => updateStatus(qt.id, 'Approved')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-emerald-700 text-white rounded"
                      >
                        <CheckCircle className="w-3 h-3" /> Approve
                      </button>
                    )}
                    {qt.status === 'Approved' && (
                      <button
                        type="button"
                        onClick={() => updateStatus(qt.id, 'Sent')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-cyan-700 text-white rounded"
                      >
                        <Send className="w-3 h-3" /> Mark Sent
                      </button>
                    )}
                    {qt.status === 'Sent' && (
                      <button
                        type="button"
                        onClick={() => updateStatus(qt.id, 'Accepted')}
                        className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-700 text-white rounded"
                      >
                        Mark Accepted
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => exportQuotationPDF(qt)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded"
                    >
                      <Download className="w-3 h-3" /> PDF
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Quotation Builder Modal */}
      {showBuilder && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateQuotation}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-3xl w-full max-h-[92vh] overflow-y-auto p-6 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-display font-bold">Build Commercial Quotation</h2>
              <button type="button" onClick={() => setShowBuilder(false)}>
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-medium mb-1">Quotation Template</label>
                <select
                  value={templateType}
                  onChange={(e) => setTemplateType(e.target.value as QuotationTemplate)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md"
                >
                  {TEMPLATES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium mb-1">Customer Account</label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.institutionName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium mb-1">VAT / Tax Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md font-mono"
                />
              </div>
            </div>

            {/* Add Instrument Selector */}
            <div>
              <label className="block font-medium mb-1">Add Instrument from Verified Catalogue</label>
              <select
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    addLineItem(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md"
              >
                <option value="">+ Select instrument to append line item...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.modelNumber}) — ${p.sellingPrice.toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            {items.length > 0 && (
              <div className="border border-slate-200 dark:border-slate-800 rounded-md overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-500">
                      <th className="text-left py-2 px-3">Item</th>
                      <th className="text-right py-2 px-2">Qty</th>
                      <th className="text-right py-2 px-2">Unit Price</th>
                      <th className="text-right py-2 px-2">Disc %</th>
                      <th className="text-right py-2 px-3">Line Total</th>
                      <th className="py-2 px-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3">
                          <div className="font-medium">{it.productName}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{it.modelNumber}</div>
                        </td>
                        <td className="py-2 px-2 text-right">
                          <input
                            type="number"
                            min={1}
                            value={it.quantity}
                            onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))}
                            className="w-14 px-1.5 py-1 text-right font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded"
                          />
                        </td>
                        <td className="py-2 px-2 text-right font-mono">${it.unitPrice.toLocaleString()}</td>
                        <td className="py-2 px-2 text-right">
                          <input
                            type="number"
                            min={0}
                            max={50}
                            value={it.discountPercent}
                            onChange={(e) => updateItem(idx, 'discountPercent', Number(e.target.value))}
                            className="w-14 px-1.5 py-1 text-right font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded"
                          />
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-semibold">
                          ${it.lineTotal.toLocaleString()}
                        </td>
                        <td className="py-2 px-2 text-right">
                          <button
                            type="button"
                            onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                            className="text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium mb-1">Delivery Terms</label>
                <input value={deliveryTerms} onChange={(e) => setDeliveryTerms(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md" />
              </div>
              <div>
                <label className="block font-medium mb-1">Payment Terms</label>
                <input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md" />
              </div>
              <div>
                <label className="block font-medium mb-1">Warranty</label>
                <input value={warrantyTerms} onChange={(e) => setWarrantyTerms(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md" />
              </div>
              <div>
                <label className="block font-medium mb-1">Validity (Days)</label>
                <input type="number" value={validityDays} onChange={(e) => setValidityDays(Number(e.target.value))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md font-mono" />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-medium mb-1">Installation & Training Scope</label>
                <input value={installationTraining} onChange={(e) => setInstallationTraining(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md" />
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md flex flex-wrap justify-between items-center gap-4 font-mono">
              <div>Subtotal: ${subtotal.toLocaleString()} · Discount: -${discountAmount.toLocaleString()} · Tax: ${taxAmount.toLocaleString()}</div>
              <div className="text-sm font-bold text-cyan-700 dark:text-cyan-400">
                Total: ${totalAmount.toLocaleString()}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowBuilder(false)} className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-md">
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 bg-cyan-700 text-white font-semibold rounded-md">
                Save Quotation Draft
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
